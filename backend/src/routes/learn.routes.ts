import { Router } from 'express'

import * as learnController from '../controllers/learn.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import { learnSearchQuerySchema } from '../validators/learn.validator'

const router = Router()

router.get(
  '/search',
  authenticate,
  validate({ query: learnSearchQuerySchema }),
  asyncHandler(learnController.search),
)

// Resolves a bare subtopic slug to its parent Subject/Topic — backs
// Practice's "Practice This Topic" pre-filtered handoff (docs/Learn_Module.md
// §6), which arrives at Practice with only a subtopic id in hand.
router.get(
  '/subtopic-location/:subtopicSlug',
  authenticate,
  asyncHandler(learnController.getSubtopicLocation),
)

export default router
