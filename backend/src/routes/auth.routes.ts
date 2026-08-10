import { Router } from 'express'

import * as authController from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { createRateLimiter } from '../middleware/rateLimiter.middleware'
import { validate } from '../middleware/validate.middleware'
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import { establishSessionSchema } from '../validators/auth.validator'

const router = Router()

// docs/Authentication.md §12 — distinct, tighter thresholds per
// auth endpoint than the app-wide default limiter in app.ts.
const sessionLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
})
const refreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many session refresh attempts. Please wait a few minutes and try again.',
})

router.post(
  '/google',
  sessionLimiter,
  validate({ body: establishSessionSchema }),
  verifyFirebaseToken,
  asyncHandler(authController.establishGoogleSession),
)

router.post(
  '/email',
  sessionLimiter,
  validate({ body: establishSessionSchema }),
  verifyFirebaseToken,
  asyncHandler(authController.establishEmailSession),
)

router.post('/refresh', refreshLimiter, asyncHandler(authController.refresh))

router.post('/logout', authenticate, asyncHandler(authController.logout))
router.post('/logout-all', authenticate, asyncHandler(authController.logoutAll))

router.get('/me', authenticate, asyncHandler(authController.getMe))

export default router
