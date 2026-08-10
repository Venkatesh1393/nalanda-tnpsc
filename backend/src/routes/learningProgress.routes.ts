import { Router } from 'express'

import * as learningProgressController from '../controllers/learningProgress.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import { updateLearningProgressSchema } from '../validators/learningProgress.validator'

const router = Router()

router.get('/', authenticate, asyncHandler(learningProgressController.getProgress))
router.get(
  '/last-visited',
  authenticate,
  asyncHandler(learningProgressController.getLastVisited),
)
router.patch(
  '/:subtopicSlug',
  authenticate,
  validate({ body: updateLearningProgressSchema }),
  asyncHandler(learningProgressController.updateProgress),
)

export default router
