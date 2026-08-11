import type { NextFunction, Request, Response } from 'express'

import { logger } from '../config/logger'
import { recordSystemEvent } from '../utils/systemEvents'

/**
 * Sprint 4 Step 74 — Production Monitoring ("Performance monitoring" /
 * "API monitoring"). Mounted early in `app.ts`, right after `morgan` — morgan
 * already logs every request's method/path/status; this middleware adds the
 * one thing morgan's `combined` format (used in production) doesn't capture
 * on its own: flagging requests that are slow enough to matter as a
 * queryable `SystemEvent`, not just another line in an access log nobody's
 * watching in real time.
 *
 * Deliberately does not touch the response itself (no added latency, no
 * altered headers) — `res.on('finish', ...)` fires after the response is
 * already sent, so this can never slow down or break a request it's
 * observing.
 */
const SLOW_REQUEST_THRESHOLD_MS = 1_000

export function requestMonitoring(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint()

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    if (durationMs < SLOW_REQUEST_THRESHOLD_MS) return

    const source = `${req.method} ${req.originalUrl.split('?')[0]}`
    logger.warn('Slow API request', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
    })
    recordSystemEvent({
      type: 'slow_request',
      severity: durationMs > SLOW_REQUEST_THRESHOLD_MS * 5 ? 'critical' : 'warning',
      message: `${source} took ${Math.round(durationMs)}ms`,
      source,
      metadata: { statusCode: res.statusCode, durationMs: Math.round(durationMs) },
    })
  })

  next()
}
