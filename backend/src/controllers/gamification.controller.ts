import type { Request, Response } from 'express'

import * as gamificationService from '../services/gamification.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'

export async function getSummary(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const summary = await gamificationService.getSummary(req.user.sub)
  sendSuccess(res, summary)
}

export async function getAchievements(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const achievements = await gamificationService.getAchievementsCatalog(req.user.sub)
  sendSuccess(res, achievements)
}
