/**
 * Sprint 4 Step 68 — Production Readiness. A single process-wide flag that
 * `server.ts` sets the instant a shutdown signal arrives, and
 * `controllers/health.controller.ts`'s readiness probe reads on every call.
 * The point: in a load-balanced deployment, flipping this to `true` makes
 * the readiness endpoint start failing *before* `server.close()` even
 * begins draining connections, so the load balancer stops routing new
 * traffic to this instance while in-flight requests still finish normally —
 * without this, a request could be routed in during the drain window and
 * hit a connection that's about to close.
 */
let shuttingDown = false

export function isShuttingDown(): boolean {
  return shuttingDown
}

export function setShuttingDown(): void {
  shuttingDown = true
}
