import type { Request, Response } from 'express'

import * as analyticsService from '../services/analytics.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import { resolveDisplayLanguage } from '../utils/language'
import type {
  AreasQuery,
  PracticeHistoryQuery,
  TopicsQuery,
} from '../validators/analytics.validator'

export async function getOverview(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const overview = await analyticsService.getOverview(req.user.sub)
  sendSuccess(res, overview)
}

export async function getSubjects(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const subjects = await analyticsService.getSubjectAnalytics(req.user.sub, lang)
  sendSuccess(res, subjects)
}

export async function getTopics(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const query = req.query as unknown as TopicsQuery
  const topics = await analyticsService.getTopicAnalytics(
    req.user.sub,
    query.subjectId,
    lang,
  )
  sendSuccess(res, topics)
}

export async function getWeakAreas(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const query = req.query as unknown as AreasQuery
  const areas = await analyticsService.getWeakAreas(req.user.sub, query.limit, lang)
  sendSuccess(res, areas)
}

export async function getStrongAreas(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const query = req.query as unknown as AreasQuery
  const areas = await analyticsService.getStrongAreas(req.user.sub, query.limit, lang)
  sendSuccess(res, areas)
}

export async function getSubjectAccuracy(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const points = await analyticsService.getSubjectAccuracy(req.user.sub, lang)
  sendSuccess(res, points)
}

export async function getWeeklyStudyTime(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const points = await analyticsService.getWeeklyStudyTime(req.user.sub)
  sendSuccess(res, points)
}

export async function getMonthlyProgress(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const points = await analyticsService.getMonthlyProgress(req.user.sub)
  sendSuccess(res, points)
}

export async function getPracticeHistory(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const query = req.query as unknown as PracticeHistoryQuery
  const points = await analyticsService.getPracticeHistory(req.user.sub, query.limit)
  sendSuccess(res, points)
}

export async function getSpeedAnalysis(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const points = await analyticsService.getSpeedAnalysis(req.user.sub, lang)
  sendSuccess(res, points)
}

export async function getRankPrediction(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const data = await analyticsService.getRankPrediction(req.user.sub)
  sendSuccess(res, data)
}

export async function getGoalCompletion(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const data = await analyticsService.getGoalCompletion(req.user.sub, lang)
  sendSuccess(res, data)
}

export async function getDifficulty(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const data = await analyticsService.getDifficultyAnalytics(req.user.sub)
  sendSuccess(res, data)
}
