import { Router } from 'express'

import * as practiceController from '../controllers/practice.controller'
import { authenticate } from '../middleware/auth.middleware'
import { createRateLimiter } from '../middleware/rateLimiter.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import {
  createSessionSchema,
  historyQuerySchema,
  sessionIdParamsSchema,
  submitAnswerSchema,
} from '../validators/practice.validator'

const router = Router()

// Answer submission is a per-question, user-driven write — this caps
// scripted abuse (e.g. brute-forcing correct options) without throttling a
// real student mid-session.
const answerRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  message: 'Too many answers submitted — please slow down.',
})

router.post(
  '/sessions',
  authenticate,
  validate({ body: createSessionSchema }),
  asyncHandler(practiceController.createSession),
)

router.get(
  '/history',
  authenticate,
  validate({ query: historyQuerySchema }),
  asyncHandler(practiceController.getHistory),
)

router.get(
  '/sessions/:sessionId',
  authenticate,
  validate({ params: sessionIdParamsSchema }),
  asyncHandler(practiceController.getSession),
)

router.post(
  '/sessions/:sessionId/answers',
  authenticate,
  answerRateLimiter,
  validate({ params: sessionIdParamsSchema, body: submitAnswerSchema }),
  asyncHandler(practiceController.submitAnswer),
)

router.post(
  '/sessions/:sessionId/finish',
  authenticate,
  validate({ params: sessionIdParamsSchema }),
  asyncHandler(practiceController.finishSession),
)

router.get(
  '/sessions/:sessionId/result',
  authenticate,
  validate({ params: sessionIdParamsSchema }),
  asyncHandler(practiceController.getResult),
)

router.get(
  '/sessions/:sessionId/review',
  authenticate,
  validate({ params: sessionIdParamsSchema }),
  asyncHandler(practiceController.getReview),
)

export default router
