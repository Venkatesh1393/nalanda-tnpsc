import { Router } from 'express'

import * as leaderboardController from '../controllers/leaderboard.controller'
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import {
  leaderboardQuerySchema,
  myPositionQuerySchema,
} from '../validators/leaderboard.validator'

const router = Router()

// `/me` before `/` isn't strictly necessary here (no `:param` collision),
// but kept in that order to match every other module's "static path before
// dynamic" convention in this codebase.
router.get(
  '/me',
  authenticate,
  validate({ query: myPositionQuerySchema }),
  asyncHandler(leaderboardController.getMyPosition),
)

router.get(
  '/',
  optionalAuthenticate,
  validate({ query: leaderboardQuerySchema }),
  asyncHandler(leaderboardController.getLeaderboard),
)

export default router
