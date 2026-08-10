import type { Request, Response } from 'express'

import * as adaptivePracticeService from '../services/adaptivePractice.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import { resolveDisplayLanguage } from '../utils/language'

export async function getRecommendations(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const recommendations = await adaptivePracticeService.getRecommendations(
    req.user.sub,
    lang,
  )
  sendSuccess(res, recommendations)
}
