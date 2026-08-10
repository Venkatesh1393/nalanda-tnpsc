import type { Request, Response } from 'express'

import { HttpStatus } from '../constants/httpStatus'
import * as currentAffairService from '../services/currentAffair.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import { resolveDisplayLanguage } from '../utils/language'
import type {
  ArchiveMonthParams,
  IdParams,
  ListQuery,
  PreviewQuery,
  SearchQuery,
} from '../validators/currentAffairs.validator'

export async function getPreview(req: Request, res: Response): Promise<void> {
  const lang = resolveDisplayLanguage(req)
  const { limit } = req.query as unknown as PreviewQuery
  const items = await currentAffairService.getPreview(limit, lang)
  sendSuccess(res, items)
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { id = '' } = req.params as IdParams
  const result = await currentAffairService.markAsRead(req.user.sub, id)
  sendSuccess(res, result)
}

export async function getList(req: Request, res: Response): Promise<void> {
  const lang = resolveDisplayLanguage(req)
  const query = req.query as unknown as ListQuery
  const { items, total } = await currentAffairService.getList(
    { period: query.period, category: query.category, month: query.month },
    query.page,
    query.limit,
    lang,
    req.user?.sub,
  )
  sendSuccess(res, items, HttpStatus.OK, {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  })
}

export async function getDetail(req: Request, res: Response): Promise<void> {
  const lang = resolveDisplayLanguage(req)
  const { id = '' } = req.params as IdParams
  const item = await currentAffairService.getDetail(id, lang, req.user?.sub)
  sendSuccess(res, item)
}

export async function getQuiz(req: Request, res: Response): Promise<void> {
  const lang = resolveDisplayLanguage(req)
  const { id = '' } = req.params as IdParams
  const questions = await currentAffairService.getQuiz(id, lang)
  sendSuccess(res, questions)
}

export async function getRelatedQuestions(req: Request, res: Response): Promise<void> {
  const lang = resolveDisplayLanguage(req)
  const { id = '' } = req.params as IdParams
  const questions = await currentAffairService.getRelatedQuestions(id, lang)
  sendSuccess(res, questions)
}

export async function search(req: Request, res: Response): Promise<void> {
  const lang = resolveDisplayLanguage(req)
  const { q } = req.query as unknown as SearchQuery
  const results = await currentAffairService.search(q, lang)
  sendSuccess(res, results)
}

export async function getArchiveMonths(_req: Request, res: Response): Promise<void> {
  const months = await currentAffairService.getArchiveMonths()
  sendSuccess(res, months)
}

export async function getArchiveForMonth(req: Request, res: Response): Promise<void> {
  const lang = resolveDisplayLanguage(req)
  const { month = '' } = req.params as ArchiveMonthParams
  const items = await currentAffairService.getArchiveForMonth(month, lang, req.user?.sub)
  sendSuccess(res, items)
}

export async function uploadImage(req: Request, res: Response): Promise<void> {
  if (!req.file) throw ApiError.badRequest('No file uploaded — expected field "image"')
  const { id = '' } = req.params as IdParams
  const article = await currentAffairService.uploadImage(id, req.file)
  sendSuccess(res, article)
}

export async function deleteImage(req: Request, res: Response): Promise<void> {
  const { id = '' } = req.params as IdParams
  const article = await currentAffairService.removeImage(id)
  sendSuccess(res, article)
}
