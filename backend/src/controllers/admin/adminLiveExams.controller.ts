import type { Request, Response } from 'express'

import * as adminLiveExamsService from '../../services/admin/adminLiveExams.service'
import { ApiError } from '../../utils/ApiError'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  CreateLiveExamBody,
  ListLiveExamsQuery,
  UpdateLiveExamBody,
} from '../../validators/liveExam.validator'

function requireActor(req: Request) {
  if (!req.user) throw ApiError.unauthorized()
  return { id: req.user.sub, role: req.user.role }
}

export async function listLiveExams(req: Request, res: Response): Promise<void> {
  const { search, examId, status, page, limit } =
    req.query as unknown as ListLiveExamsQuery
  const result = await adminLiveExamsService.listLiveExams(
    { search, examId, status },
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

export async function getLiveExam(req: Request, res: Response): Promise<void> {
  const { liveExamId = '' } = req.params
  sendSuccess(res, await adminLiveExamsService.getLiveExamById(liveExamId))
}

export async function createLiveExam(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const exam = await adminLiveExamsService.createLiveExam(
    actor,
    req.body as CreateLiveExamBody,
  )
  sendSuccess(res, exam, 201)
}

export async function updateLiveExam(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { liveExamId = '' } = req.params
  const exam = await adminLiveExamsService.updateLiveExam(
    actor,
    liveExamId,
    req.body as UpdateLiveExamBody,
  )
  sendSuccess(res, exam)
}

export async function publishLiveExam(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { liveExamId = '' } = req.params
  sendSuccess(res, await adminLiveExamsService.publishLiveExam(actor, liveExamId))
}

export async function cancelLiveExam(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { liveExamId = '' } = req.params
  sendSuccess(res, await adminLiveExamsService.cancelLiveExam(actor, liveExamId))
}

export async function publishLiveExamResults(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { liveExamId = '' } = req.params
  sendSuccess(res, await adminLiveExamsService.publishLiveExamResults(actor, liveExamId))
}
