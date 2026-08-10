import type { Request, Response } from 'express'

import { isDatabaseConnected } from '../config/database'
import { isShuttingDown } from '../config/shutdownState'
import { HttpStatus } from '../constants/httpStatus'

/**
 * Sprint 4 Step 68 — Production Readiness split this single endpoint into
 * two, per standard container-orchestration convention (Kubernetes
 * liveness/readiness probes, ECS/ALB health checks, etc.):
 *
 * - `getHealth` (liveness — "is this process alive") never checks the
 *   database. A liveness probe failing triggers a *restart* — if it depended
 *   on Mongo, a transient Atlas blip would cause an orchestrator to kill and
 *   restart perfectly healthy processes in a loop, which fixes nothing and
 *   makes an outage worse.
 * - `getReadiness` (readiness — "can this instance serve traffic right
 *   now") checks both the database connection and this process's own
 *   shutdown state (`config/shutdownState.ts`). A readiness probe failing
 *   just takes the instance out of load-balancer rotation — the correct
 *   response to "DB is down" or "this instance is draining for shutdown,"
 *   neither of which a restart would help.
 *
 * Both stay unauthenticated, outside the versioned `/api/{version}`
 * namespace, and outside the `{ success, data, error }` response envelope
 * (`utils/ApiResponse.ts`) other endpoints use — monitoring tooling expects
 * a small, stable, unwrapped body.
 */
export function getHealth(_req: Request, res: Response): void {
  res.status(HttpStatus.OK).json({
    status: 'OK',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  })
}

export function getReadiness(_req: Request, res: Response): void {
  if (isShuttingDown()) {
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      status: 'NOT_READY',
      reason: 'Shutting down',
    })
    return
  }

  if (!isDatabaseConnected()) {
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      status: 'NOT_READY',
      reason: 'Database disconnected',
    })
    return
  }

  res.status(HttpStatus.OK).json({
    status: 'READY',
    database: 'Connected',
    timestamp: new Date().toISOString(),
  })
}
