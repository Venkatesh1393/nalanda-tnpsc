import { Router } from 'express'

import * as analyticsController from '../controllers/analytics.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import {
  areasQuerySchema,
  practiceHistoryQuerySchema,
  topicsQuerySchema,
} from '../validators/analytics.validator'

const router = Router()

router.get('/overview', authenticate, asyncHandler(analyticsController.getOverview))
router.get('/subjects', authenticate, asyncHandler(analyticsController.getSubjects))
router.get(
  '/topics',
  authenticate,
  validate({ query: topicsQuerySchema }),
  asyncHandler(analyticsController.getTopics),
)
router.get(
  '/weak-areas',
  authenticate,
  validate({ query: areasQuerySchema }),
  asyncHandler(analyticsController.getWeakAreas),
)
router.get(
  '/strong-areas',
  authenticate,
  validate({ query: areasQuerySchema }),
  asyncHandler(analyticsController.getStrongAreas),
)
router.get(
  '/subject-accuracy',
  authenticate,
  asyncHandler(analyticsController.getSubjectAccuracy),
)
router.get(
  '/weekly-study-time',
  authenticate,
  asyncHandler(analyticsController.getWeeklyStudyTime),
)
router.get(
  '/monthly-progress',
  authenticate,
  asyncHandler(analyticsController.getMonthlyProgress),
)
router.get(
  '/practice-history',
  authenticate,
  validate({ query: practiceHistoryQuerySchema }),
  asyncHandler(analyticsController.getPracticeHistory),
)
router.get(
  '/speed-analysis',
  authenticate,
  asyncHandler(analyticsController.getSpeedAnalysis),
)
router.get('/rank', authenticate, asyncHandler(analyticsController.getRankPrediction))
router.get(
  '/goal-completion',
  authenticate,
  asyncHandler(analyticsController.getGoalCompletion),
)
router.get('/difficulty', authenticate, asyncHandler(analyticsController.getDifficulty))

export default router
