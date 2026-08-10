import type { Request, Response } from 'express'

import * as adminAiQuestionGeneratorService from '../../services/admin/adminAiQuestionGenerator.service'
import { ApiError } from '../../utils/ApiError'
import { HttpStatus } from '../../constants/httpStatus'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  DraftIdParams,
  GenerateQuestionsBody,
  ListDraftsQuery,
  RejectDraftBody,
  UpdateDraftBody,
} from '../../validators/admin/aiQuestionGenerator.validator'

/** Every handler requires `req.user` — guaranteed by `authenticate` +
 * `authorizeRoles` already mounted on every `/admin/*` route, same
 * defensive-typing precedent as `adminQuestions.controller.ts`'s identical
 * helper. */
function requireActor(req: Request) {
  if (!req.user) throw ApiError.unauthorized()
  return { id: req.user.sub, role: req.user.role }
}

export async function generateQuestions(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const body = req.body as GenerateQuestionsBody
  const result = await adminAiQuestionGeneratorService.generateQuestions(actor, body)
  sendSuccess(res, result, HttpStatus.CREATED)
}

export async function listDrafts(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListDraftsQuery
  const result = await adminAiQuestionGeneratorService.listDrafts(
    {
      status: query.status,
      subjectId: query.subjectId,
      topicId: query.topicId,
      batchId: query.batchId,
    },
    query.page,
    query.limit,
  )
  sendSuccess(res, result.items, HttpStatus.OK, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / result.limit) || 1,
  })
}

export async function getDraft(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as DraftIdParams
  const draft = await adminAiQuestionGeneratorService.getDraftById(id)
  sendSuccess(res, draft)
}

export async function updateDraft(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as DraftIdParams
  const body = req.body as UpdateDraftBody
  const draft = await adminAiQuestionGeneratorService.updateDraft(actor, id, body)
  sendSuccess(res, draft)
}

export async function approveDraft(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as DraftIdParams
  const draft = await adminAiQuestionGeneratorService.approveDraft(actor, id)
  sendSuccess(res, draft)
}

export async function rejectDraft(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as DraftIdParams
  const { reason } = req.body as RejectDraftBody
  const draft = await adminAiQuestionGeneratorService.rejectDraft(actor, id, reason)
  sendSuccess(res, draft)
}
