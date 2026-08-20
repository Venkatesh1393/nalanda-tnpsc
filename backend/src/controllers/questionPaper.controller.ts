import type { Request, Response } from 'express'

import * as questionPaperService from '../services/questionPaper.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import type { IdParams, ListQuery } from '../validators/questionPaper.validator'

export async function listPapers(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { examId, year, tnpscExamType, page, limit } = req.query as unknown as ListQuery
  const result = await questionPaperService.listPapers(
    req.user.sub,
    { examId, year, tnpscExamType },
    page,
    limit,
  )
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / result.limit) || 1,
    freeSlotsRemaining: result.freeSlotsRemaining,
    freeLimit: result.freeLimit,
    isUnlocked: result.isUnlocked,
  })
}

/** The only endpoint that ever returns a paper's real `fileUrl` — gated by
 * `questionPaper.service.ts#getDownloadUrl`'s free-limit/purchase check. */
export async function downloadPaper(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await questionPaperService.getDownloadUrl(req.user.sub, id))
}
