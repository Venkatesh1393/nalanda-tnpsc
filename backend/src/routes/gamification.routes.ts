import { Router } from 'express'

import * as gamificationController from '../controllers/gamification.controller'
import { authenticate } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/summary', authenticate, asyncHandler(gamificationController.getSummary))
router.get(
  '/achievements',
  authenticate,
  asyncHandler(gamificationController.getAchievements),
)

export default router
