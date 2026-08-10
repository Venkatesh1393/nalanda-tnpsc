import { Router } from 'express'
import type { Request } from 'express'

import * as aiTutorController from '../controllers/aiTutor.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireFeature } from '../middleware/entitlement.middleware'
import { createRateLimiter } from '../middleware/rateLimiter.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import {
  conversationIdParamsSchema,
  createConversationBodySchema,
  listConversationsQuerySchema,
  sendMessageBodySchema,
} from '../validators/aiTutor.validator'

/**
 * Sprint 4 Step 59 — Nalanda AI Tutor. `requireFeature('ai_tutor')` gates
 * every route here at Pro/Institutional, same layering as
 * `routes/ai.routes.ts`'s `/explain` (authenticate → entitlement → rate
 * limit → validate → controller). `getUsage` is intentionally readable at
 * the same gate — a Pro user should be able to see their own remaining
 * quota without it counting as a chat message.
 *
 * Same two-layer IP + per-user rate limiting as Step 58's AI Explanation
 * abuse protection, sized for a chat feature's higher natural request
 * frequency (many short turns) rather than Step 57/58's one-shot
 * explanation request.
 */
const router = Router()

router.use(authenticate, requireFeature('ai_tutor'))

const sendMessageIpRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  message: 'Too many AI Tutor messages — please wait a moment and try again.',
})

const sendMessageUserRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  message: 'Too many AI Tutor messages from this account — please wait a moment.',
  keyGenerator: (req: Request) => req.user?.sub ?? req.ip ?? 'anonymous',
})

router.get('/usage', asyncHandler(aiTutorController.getUsage))

router.get(
  '/conversations',
  validate({ query: listConversationsQuerySchema }),
  asyncHandler(aiTutorController.listConversations),
)

router.post(
  '/conversations',
  validate({ body: createConversationBodySchema }),
  asyncHandler(aiTutorController.createConversation),
)

router.get(
  '/conversations/:conversationId',
  validate({ params: conversationIdParamsSchema }),
  asyncHandler(aiTutorController.getConversation),
)

router.patch(
  '/conversations/:conversationId/pin',
  validate({ params: conversationIdParamsSchema }),
  asyncHandler(aiTutorController.pinConversation),
)

router.patch(
  '/conversations/:conversationId/unpin',
  validate({ params: conversationIdParamsSchema }),
  asyncHandler(aiTutorController.unpinConversation),
)

router.delete(
  '/conversations/:conversationId',
  validate({ params: conversationIdParamsSchema }),
  asyncHandler(aiTutorController.deleteConversation),
)

router.post(
  '/conversations/:conversationId/messages',
  sendMessageIpRateLimiter,
  sendMessageUserRateLimiter,
  validate({ params: conversationIdParamsSchema, body: sendMessageBodySchema }),
  asyncHandler(aiTutorController.sendMessage),
)

export default router
