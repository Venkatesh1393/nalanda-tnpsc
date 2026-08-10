import path from 'node:path'
import winston from 'winston'

import { env, isProduction } from './env'

const logsDir = path.join(__dirname, '..', '..', 'logs')

const { combine, timestamp, errors, printf, colorize, json } = winston.format

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `[${ts}] ${level}: ${stack ?? message}${metaString}`
  }),
)

const fileFormat = combine(timestamp(), errors({ stack: true }), json())

/**
 * The single Winston instance for the whole app — import `logger` everywhere
 * instead of calling console.log directly, so every log line carries a
 * consistent level/timestamp/format and lands in logs/ as well as stdout.
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: fileFormat,
  defaultMeta: { service: 'nalanda-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }),
  ],
  exitOnError: false,
})

// Console output is human-readable in development, JSON in production (so it's
// easily ingested by a log aggregator without a second parsing step).
logger.add(
  new winston.transports.Console({
    format: isProduction ? fileFormat : consoleFormat,
  }),
)

/** Adapts Winston to Morgan's expected `{ write }` stream interface. */
export const morganStream = {
  write: (message: string) => logger.http(message.trim()),
}
