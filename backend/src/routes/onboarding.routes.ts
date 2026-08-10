import { Router } from 'express'

import * as onboardingController from '../controllers/onboarding.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import {
  onboardingCompleteSchema,
  onboardingDraftSchema,
} from '../validators/onboarding.validator'

const router = Router()

router.get('/', authenticate, asyncHandler(onboardingController.getOnboarding))

router.patch(
  '/',
  authenticate,
  validate({ body: onboardingDraftSchema }),
  asyncHandler(onboardingController.saveOnboardingDraft),
)

router.post(
  '/complete',
  authenticate,
  validate({ body: onboardingCompleteSchema }),
  asyncHandler(onboardingController.completeOnboarding),
)

export default router
