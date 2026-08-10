import type { Request, Response } from 'express'

import * as liveExamService from '../services/liveExam.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import { resolveDisplayLanguage } from '../utils/language'
import type { ListQuery, SubmitAnswerBody } from '../validators/liveExam.validator'

export async function list(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const query = req.query as unknown as ListQuery
  const exams = await liveExamService.getList(
    req.user.sub,
    query.tab,
    query.examCategory,
    lang,
  )
  sendSuccess(res, exams)
}

export async function detail(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { liveExamId = '' } = req.params
  const exam = await liveExamService.getDetail(req.user.sub, liveExamId, lang)
  sendSuccess(res, exam)
}

export async function join(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { liveExamId = '' } = req.params
  const attempt = await liveExamService.joinLiveExam(
    req.user.sub,
    liveExamId,
    req.user.subscriptionTier,
    lang,
  )
  sendSuccess(res, attempt)
}

export async function getAttempt(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { liveExamId = '' } = req.params
  const attempt = await liveExamService.getAttempt(req.user.sub, liveExamId, lang)
  sendSuccess(res, attempt)
}

export async function submitAnswer(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { liveExamId = '' } = req.params
  const body = req.body as SubmitAnswerBody
  const result = await liveExamService.submitAnswer(req.user.sub, liveExamId, body)
  sendSuccess(res, result)
}

export async function finish(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { liveExamId = '' } = req.params
  const result = await liveExamService.finishAttempt(req.user.sub, liveExamId)
  sendSuccess(res, result)
}

export async function result(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { liveExamId = '' } = req.params
  const data = await liveExamService.getResult(req.user.sub, liveExamId, lang)
  sendSuccess(res, data)
}

export async function myAttempts(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const attempts = await liveExamService.getMyAttempts(req.user.sub, lang)
  sendSuccess(res, attempts)
}
