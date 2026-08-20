import type { Request, Response } from 'express'

import * as adminQuestionPapersService from '../../services/admin/adminQuestionPapers.service'
import { ApiError } from '../../utils/ApiError'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  AdminIdParams,
  CreateQuestionPaperBody,
  ListAdminQuestionPapersQuery,
  UpdateQuestionPaperBody,
  UpdateQuestionPaperStatusBody,
} from '../../validators/admin/questionPapers.validator'

function requireActor(req: Request) {
  if (!req.user) throw ApiError.unauthorized()
  return { id: req.user.sub, role: req.user.role }
}

export async function listQuestionPapers(req: Request, res: Response): Promise<void> {
  const { search, examId, year, status, page, limit } =
    req.query as unknown as ListAdminQuestionPapersQuery
  const result = await adminQuestionPapersService.listQuestionPapers(
    { search, examId, year, status },
    page,
    limit,
  )
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / result.limit) || 1,
  })
}

export async function getQuestionPaper(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as AdminIdParams
  sendSuccess(res, await adminQuestionPapersService.getQuestionPaperById(id))
}

export async function createQuestionPaper(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const paper = await adminQuestionPapersService.createQuestionPaper(
    actor,
    req.body as CreateQuestionPaperBody,
  )
  sendSuccess(res, paper, 201)
}

export async function updateQuestionPaper(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as AdminIdParams
  const paper = await adminQuestionPapersService.updateQuestionPaper(
    actor,
    id,
    req.body as UpdateQuestionPaperBody,
  )
  sendSuccess(res, paper)
}

export async function updateQuestionPaperStatus(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as AdminIdParams
  const { isActive } = req.body as UpdateQuestionPaperStatusBody
  sendSuccess(
    res,
    await adminQuestionPapersService.updateQuestionPaperStatus(actor, id, isActive),
  )
}

export async function uploadQuestionPaperFile(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  if (!req.file) throw ApiError.badRequest('No file uploaded — expected field "file"')
  const { id } = req.params as unknown as AdminIdParams
  sendSuccess(
    res,
    await adminQuestionPapersService.uploadQuestionPaperFile(actor, id, req.file),
  )
}

export async function archiveQuestionPaper(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as AdminIdParams
  sendSuccess(res, await adminQuestionPapersService.archiveQuestionPaper(actor, id))
}

export async function restoreQuestionPaper(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as AdminIdParams
  sendSuccess(res, await adminQuestionPapersService.restoreQuestionPaper(actor, id))
}
