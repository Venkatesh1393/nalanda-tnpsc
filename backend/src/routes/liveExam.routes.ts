import { Router } from 'express'

import * as liveExamController from '../controllers/liveExam.controller'
import { authenticate } from '../middleware/auth.middleware'
import { createRateLimiter } from '../middleware/rateLimiter.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import {
  liveExamIdParamsSchema,
  listQuerySchema,
  submitAnswerSchema,
} from '../validators/liveExam.validator'

const router = Router()

const answerRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  message: 'Too many answers submitted — please slow down.',
})

router.get(
  '/',
  authenticate,
  validate({ query: listQuerySchema }),
  asyncHandler(liveExamController.list),
)

// Static segment — must be registered before `/:liveExamId` (Express
// matches routes in declaration order, unlike React Router's static-over-
// dynamic ranking), otherwise "attempts" would be swallowed as a
// `liveExamId` value.
router.get('/attempts', authenticate, asyncHandler(liveExamController.myAttempts))

router.get(
  '/:liveExamId',
  authenticate,
  validate({ params: liveExamIdParamsSchema }),
  asyncHandler(liveExamController.detail),
)

router.post(
  '/:liveExamId/join',
  authenticate,
  validate({ params: liveExamIdParamsSchema }),
  asyncHandler(liveExamController.join),
)

router.get(
  '/:liveExamId/attempt',
  authenticate,
  validate({ params: liveExamIdParamsSchema }),
  asyncHandler(liveExamController.getAttempt),
)

router.post(
  '/:liveExamId/attempt/answers',
  authenticate,
  answerRateLimiter,
  validate({ params: liveExamIdParamsSchema, body: submitAnswerSchema }),
  asyncHandler(liveExamController.submitAnswer),
)

router.post(
  '/:liveExamId/attempt/finish',
  authenticate,
  validate({ params: liveExamIdParamsSchema }),
  asyncHandler(liveExamController.finish),
)

router.get(
  '/:liveExamId/result',
  authenticate,
  validate({ params: liveExamIdParamsSchema }),
  asyncHandler(liveExamController.result),
)

export default router
