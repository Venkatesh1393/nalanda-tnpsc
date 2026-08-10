import dns from 'node:dns'

import mongoose from 'mongoose'

import { env } from './env'
import { logger } from './logger'

mongoose.set('strictQuery', true)

// `mongodb+srv://` requires resolving DNS SRV/TXT records for the cluster.
// Node's default resolver (via some Windows/router/ISP DNS setups) answers
// plain A/AAAA queries fine but returns ECONNREFUSED specifically for SRV
// queries — a well-documented Node.js-on-Windows + Atlas gotcha, confirmed
// here via `nslookup -type=SRV` succeeding against the OS resolver while
// Node's own `dns.resolveSrv` failed. Pointing Node's resolver at public
// DNS sidesteps it without touching the OS-level network configuration.
dns.setServers(['8.8.8.8', '1.1.1.1'])

const MAX_CONNECTION_RETRIES = 5
const INITIAL_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 15_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let listenersAttached = false

/**
 * Wired once, independent of how many times `connectDatabase` retries —
 * these fire for the connection's entire lifetime (initial connect, any
 * later drop, the MongoDB driver's own automatic reconnection), not just
 * the first attempt.
 */
function attachConnectionListeners(): void {
  if (listenersAttached) return
  listenersAttached = true

  mongoose.connection.on('connected', () => {
    logger.info(`MongoDB connected — database "${mongoose.connection.name}"`)
  })

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error', { error })
  })

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost')
  })
}

/**
 * Opens the single Mongoose connection for the process. Call once from
 * server.ts before the HTTP server starts listening — repositories assume
 * a connection already exists and never call this themselves.
 *
 * Retries the *initial* connection attempt with exponential backoff
 * (capped) — covers the common case of the app starting slightly before
 * network/DNS/Atlas is reachable. Once connected, ongoing resilience (a
 * connection dropping mid-process) is handled by the MongoDB driver's own
 * automatic reconnection; `attachConnectionListeners` just logs it.
 */
export async function connectDatabase(): Promise<void> {
  attachConnectionListeners()

  let attempt = 0
  let delay = INITIAL_RETRY_DELAY_MS

  while (attempt < MAX_CONNECTION_RETRIES) {
    attempt += 1
    try {
      await mongoose.connect(env.MONGODB_URI)
      return
    } catch (error) {
      const isLastAttempt = attempt >= MAX_CONNECTION_RETRIES
      logger.error(
        `MongoDB connection attempt ${attempt}/${MAX_CONNECTION_RETRIES} failed` +
          (isLastAttempt ? '' : ` — retrying in ${delay}ms`),
        { error },
      )
      if (isLastAttempt) throw error

      await sleep(delay)
      delay = Math.min(delay * 2, MAX_RETRY_DELAY_MS)
    }
  }
}

/** Closes the Mongoose connection — used during graceful shutdown. */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect()
}

/** `true` only when the connection is fully established (readyState 1). */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected
}
