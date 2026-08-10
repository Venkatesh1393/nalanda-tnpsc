import { Router } from 'express'

import * as adaptivePracticeController from '../controllers/adaptivePractice.controller'
import { authenticate } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get(
  '/recommendations',
  authenticate,
  asyncHandler(adaptivePracticeController.getRecommendations),
)

export default router
