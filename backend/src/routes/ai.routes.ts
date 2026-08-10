import { Router } from 'express'
import type { Request } from 'express'

import * as aiController from '../controllers/ai.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireFeature } from '../middleware/entitlement.middleware'
import { createRateLimiter } from '../middleware/rateLimiter.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import { explainQuestionBodySchema } from '../validators/ai.validator'
import aiTutorRoutes from './aiTutor.routes'

/**
 * Sprint 4 Step 57 — Premium AI Explanation. `requireFeature('ai_explanations')`
 * (Sprint 4 Step 55's entitlement middleware, defined then and unused until
 * now) is the real backend gate — a free-tier caller gets a 403 here
 * regardless of what the frontend UI shows. The real per-user cost control
 * (daily quota, cache reuse, in-flight duplicate-request dedup) lives in
 * `services/ai/questionExplanation.service.ts`, since it needs a real user
 * identity and DB state that a request-count limiter can't see.
 *
 * Sprint 4 Step 58 — abuse protection is now two independent layers, since
 * either alone has a gap: the IP limiter (`explainIpRateLimiter`) catches
 * unauthenticated/scripted bursts but a single abusive account behind a
 * rotating IP or shared NAT slips through it; the per-user limiter
 * (`explainUserRateLimiter`) catches that account regardless of IP, but
 * can't see pre-auth traffic. Both run before the DB-backed quota check so a
 * burst never even reaches it.
 */
const router = Router()

const explainIpRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 15,
  message: 'Too many AI Explanation requests — please wait a moment and try again.',
})

const explainUserRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  message: 'Too many AI Explanation requests from this account — please wait a moment.',
  keyGenerator: (req: Request) => req.user?.sub ?? req.ip ?? 'anonymous',
})

router.post(
  '/explain',
  authenticate,
  requireFeature('ai_explanations'),
  explainIpRateLimiter,
  explainUserRateLimiter,
  validate({ body: explainQuestionBodySchema }),
  asyncHandler(aiController.explainQuestion),
)

// Sprint 4 Step 59 — Nalanda AI Tutor. `aiTutorRoutes` applies its own
// `authenticate`/`requireFeature('ai_tutor')` gate internally (a different,
// higher-tier feature than `/explain`'s `ai_explanations`).
router.use('/tutor', aiTutorRoutes)

export default router
