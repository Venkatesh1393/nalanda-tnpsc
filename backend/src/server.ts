import type { Server } from 'node:http'

import { createApp } from './app'
import { connectDatabase, disconnectDatabase } from './config/database'
import { env } from './config/env'
import { logger } from './config/logger'
import { setShuttingDown } from './config/shutdownState'

let server: Server | undefined

async function start(): Promise<void> {
  await connectDatabase()

  const app = createApp()
  server = app.listen(env.PORT, () => {
    logger.info(`Nalanda TNPSC API listening on port ${env.PORT} [${env.NODE_ENV}]`)

    // Sprint 4 Step 72 — Production Backend Deployment. Only defined when
    // this process has an IPC channel to a parent (PM2's `wait_ready`/
    // `listen_timeout` in ecosystem.config.js, or Node's own `fork()`) —
    // plain `node dist/server.js` and Docker's `CMD` never set this, so the
    // guard makes the signal a no-op everywhere else instead of throwing.
    // Without it, PM2 would consider the process "online" the instant it
    // forks, before the HTTP server (or the `connectDatabase()` await above)
    // has actually finished — exactly the gap that makes a zero-downtime
    // `pm2 reload` briefly serve connection-refused/DB-not-ready responses.
    process.send?.('ready')
  })
}

/**
 * Sprint 4 Step 68 — Production Readiness hardened this beyond the original
 * "close server, disconnect DB, exit" happy path with two things a real
 * deployment needs:
 *
 * 1. A re-entrancy guard — some orchestrators (and impatient operators)
 *    send SIGTERM twice; without this, a second signal would race a second
 *    `server.close()`/`disconnectDatabase()` against the first and could
 *    throw into an unhandled rejection instead of just exiting once.
 * 2. A bounded force-exit timeout — `server.close()` only resolves once
 *    every in-flight connection ends on its own; a client holding a
 *    keep-alive/long-poll connection open could otherwise wedge the process
 *    forever, one of the most common real-world "graceful shutdown that
 *    isn't" bugs. `SHUTDOWN_TIMEOUT_MS` guarantees the process exits either
 *    way — cleanly if the drain finishes first, forcibly if not.
 *
 * `setShuttingDown()` fires *before* anything else so `getReadiness`
 * (`controllers/health.controller.ts`) starts failing immediately — a load
 * balancer polling readiness stops routing new traffic within one poll
 * interval, well before the connection drain below even starts.
 */
const SHUTDOWN_TIMEOUT_MS = 10_000

let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  setShuttingDown()

  logger.info(`${signal} received — shutting down gracefully`)

  const forceExitTimer = setTimeout(() => {
    logger.error(
      `Graceful shutdown did not finish within ${SHUTDOWN_TIMEOUT_MS}ms — forcing exit`,
    )
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  forceExitTimer.unref()

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()))
      })
    }
    await disconnectDatabase()
    logger.info('Shutdown complete')
    clearTimeout(forceExitTimer)
    process.exit(0)
  } catch (error) {
    logger.error('Error during shutdown', { error })
    clearTimeout(forceExitTimer)
    process.exit(1)
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

// The process is in an undefined state after either of these (Node's own
// guidance: never resume normal operation past an uncaught exception) — but
// routing through the same bounded `shutdown()` instead of a raw
// `process.exit(1)` still gives in-flight requests/the DB connection a
// chance to close cleanly, capped by the same force-exit timeout so a
// broken shutdown path can never turn a crash into a hang.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason })
  void shutdown('unhandledRejection')
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { message: error.message, stack: error.stack })
  void shutdown('uncaughtException')
})

start().catch((error) => {
  logger.error('Failed to start server', { error })
  process.exit(1)
})
