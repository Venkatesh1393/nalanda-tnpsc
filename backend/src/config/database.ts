import dns from 'node:dns'

import mongoose, { type mongo } from 'mongoose'

import { env } from './env'
import { logger } from './logger'
import { recordSystemEvent } from '../utils/systemEvents'

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

/**
 * Sprint 4 Step 73 — explicit rather than relying on the MongoDB Node
 * driver's own defaults (which exist, but aren't declared anywhere in this
 * codebase, making the actual production behavior implicit). Each bounds a
 * different failure mode:
 * - `serverSelectionTimeoutMS`: how long to search for a usable server
 *   before giving up on ONE connection attempt — this is what
 *   `MAX_CONNECTION_RETRIES`'s backoff loop below actually retries against.
 * - `connectTimeoutMS`: how long a single TCP handshake may take.
 * - `socketTimeoutMS`: how long an already-established socket may sit idle
 *   mid-operation before the driver kills it — protects against a query
 *   hanging forever on a half-dead connection Atlas never explicitly closed.
 */
const CONNECTION_OPTIONS = {
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  // Sprint 4 Step 74 — required for `attachSlowQueryMonitoring` below to
  // receive `commandStarted`/`commandSucceeded`/`commandFailed` events at
  // all; `false` is the driver's default.
  monitorCommands: true,
}

/**
 * Sprint 4 Step 74 — Production Monitoring ("Database: Slow queries").
 * Command names that represent an actual application query/write —
 * deliberately excludes the driver's own handshake/heartbeat traffic
 * (`hello`, `ismaster`, `ping`, `endSessions`, ...), which would otherwise
 * dominate this signal with noise that was never a real app-level query.
 */
const MONITORED_COMMANDS = new Set([
  'find',
  'aggregate',
  'update',
  'delete',
  'insert',
  'count',
  'distinct',
  'findandmodify',
  'getmore',
])
const SLOW_QUERY_THRESHOLD_MS = 200

let slowQueryMonitoringAttached = false

/**
 * Uses the underlying MongoDB driver's command-monitoring events
 * (`CONNECTION_OPTIONS.monitorCommands`) rather than a Mongoose schema
 * plugin — a plugin only applies to schemas *compiled after* it's
 * registered, making correctness depend on import order across this
 * codebase's ~20+ model files (an easy thing for a future change to
 * accidentally break). Command monitoring instead observes every command
 * the driver actually sends, at the connection level, regardless of which
 * model or how many files away it originated from.
 *
 * `commandStarted` carries the collection name (as the value of the
 * command-name key, e.g. `{ find: 'questions', filter: {...} }|`) that
 * `commandSucceeded`/`commandFailed` don't repeat — correlated here by
 * `requestId`, cleaned up the moment each pair resolves so this map never
 * grows unbounded.
 */
function attachSlowQueryMonitoring(): void {
  if (slowQueryMonitoringAttached) return
  slowQueryMonitoringAttached = true

  const client = mongoose.connection.getClient()
  const pending = new Map<number, { collection: string; startedAt: number }>()

  client.on('commandStarted', (event: mongo.CommandStartedEvent) => {
    if (!MONITORED_COMMANDS.has(event.commandName)) return
    const collection = (event.command as Record<string, unknown>)[event.commandName]
    pending.set(event.requestId, {
      collection: typeof collection === 'string' ? collection : event.commandName,
      startedAt: Date.now(),
    })
  })

  const finish = (event: mongo.CommandSucceededEvent | mongo.CommandFailedEvent): void => {
    const info = pending.get(event.requestId)
    pending.delete(event.requestId)
    if (!info || event.duration < SLOW_QUERY_THRESHOLD_MS) return

    const source = `${info.collection}.${event.commandName}`
    logger.warn('Slow MongoDB query', {
      collection: info.collection,
      command: event.commandName,
      durationMs: event.duration,
    })
    recordSystemEvent({
      type: 'slow_query',
      severity: event.duration > SLOW_QUERY_THRESHOLD_MS * 5 ? 'critical' : 'warning',
      message: `${source} took ${event.duration}ms`,
      source,
      metadata: { durationMs: event.duration },
    })
  }

  client.on('commandSucceeded', finish)
  client.on('commandFailed', finish)
}

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
      await mongoose.connect(env.MONGODB_URI, CONNECTION_OPTIONS)
      attachSlowQueryMonitoring()
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
