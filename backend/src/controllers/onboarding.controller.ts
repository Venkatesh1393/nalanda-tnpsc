import type { Request, Response } from 'express'

import * as onboardingService from '../services/onboarding.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import type {
  OnboardingCompleteBody,
  OnboardingDraftBody,
} from '../validators/onboarding.validator'

export async function getOnboarding(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const state = await onboardingService.getState(req.user.sub)
  sendSuccess(res, state)
}

export async function saveOnboardingDraft(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const state = await onboardingService.saveDraft(
    req.user.sub,
    req.body as OnboardingDraftBody,
  )
  sendSuccess(res, state)
}

export async function completeOnboarding(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const state = await onboardingService.complete(
    req.user.sub,
    req.body as OnboardingCompleteBody,
  )
  sendSuccess(res, state)
}
