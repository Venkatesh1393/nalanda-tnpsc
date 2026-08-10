import type { Request, Response } from 'express'

import { HttpStatus } from '../constants/httpStatus'
import * as practiceService from '../services/practice.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import { resolveDisplayLanguage } from '../utils/language'
import type {
  CreateSessionBody,
  HistoryQuery,
  SubmitAnswerBody,
} from '../validators/practice.validator'

export async function createSession(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const body = req.body as CreateSessionBody

  const session = await practiceService.createSession(
    req.user.sub,
    {
      examCategory: body.examCategory,
      subjectSlug: body.subjectId,
      topicSlug: body.topicId,
      questionCount: body.questionCount,
      difficulty: body.difficulty,
    },
    lang,
  )
  sendSuccess(res, session, HttpStatus.CREATED)
}

export async function getSession(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { sessionId = '' } = req.params
  const session = await practiceService.getSession(req.user.sub, sessionId, lang)
  sendSuccess(res, session)
}

export async function submitAnswer(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { sessionId = '' } = req.params
  const body = req.body as SubmitAnswerBody
  const result = await practiceService.submitAnswer(req.user.sub, sessionId, body, lang)
  sendSuccess(res, result)
}

export async function finishSession(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { sessionId = '' } = req.params
  const result = await practiceService.finishSession(req.user.sub, sessionId, lang)
  sendSuccess(res, result)
}

export async function getResult(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { sessionId = '' } = req.params
  const result = await practiceService.getResult(req.user.sub, sessionId, lang)
  sendSuccess(res, result)
}

export async function getReview(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { sessionId = '' } = req.params
  const review = await practiceService.getReview(
    req.user.sub,
    sessionId,
    req.user.subscriptionTier,
    lang,
  )
  sendSuccess(res, review)
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const query = req.query as unknown as HistoryQuery
  const history = await practiceService.getHistory(
    req.user.sub,
    { subjectSlug: query.subjectId, topicSlug: query.topicId },
    query.page,
    query.limit,
    query.sort,
    lang,
  )
  sendSuccess(res, history.items, HttpStatus.OK, {
    page: history.page,
    limit: history.limit,
    total: history.total,
    totalPages: history.totalPages,
  })
}
