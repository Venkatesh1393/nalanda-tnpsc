import { Router } from 'express'

import * as publicController from '../controllers/public.controller'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import { topRankersQuerySchema } from '../validators/public.validator'

const router = Router()

// Unauthenticated by design — the Landing Page's pre-signup proof section
// (docs/API.md §17).
router.get(
  '/top-rankers',
  validate({ query: topRankersQuerySchema }),
  asyncHandler(publicController.getTopRankers),
)

export default router
