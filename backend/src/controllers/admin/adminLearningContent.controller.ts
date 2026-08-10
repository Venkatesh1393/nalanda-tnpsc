import type { Request, Response } from 'express'

import * as adminLearningContentService from '../../services/admin/adminLearningContent.service'
import { ApiError } from '../../utils/ApiError'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  CreateLessonBody,
  CreateStudyMaterialBody,
  IdParams,
  ListLessonsQuery,
  ListStudyMaterialsQuery,
  UpdateActiveStatusBody,
  UpdateLessonBody,
  UpdateStudyMaterialBody,
} from '../../validators/contentHierarchy.validator'

function requireActor(req: Request) {
  if (!req.user) throw ApiError.unauthorized()
  return { id: req.user.sub, role: req.user.role }
}

function pageMeta(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
}

// --- Lesson ---

export async function listLessons(req: Request, res: Response): Promise<void> {
  const { search, subtopicId, status, page, limit } =
    req.query as unknown as ListLessonsQuery
  const result = await adminLearningContentService.listLessons(
    { search, subtopicId, status },
    page,
    limit,
  )
  sendSuccess(res, result.items, 200, pageMeta(result.total, result.page, result.limit))
}

export async function getLesson(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminLearningContentService.getLessonById(id))
}

export async function createLesson(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  sendSuccess(
    res,
    await adminLearningContentService.createLesson(actor, req.body as CreateLessonBody),
    201,
  )
}

export async function updateLesson(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(
    res,
    await adminLearningContentService.updateLesson(
      actor,
      id,
      req.body as UpdateLessonBody,
    ),
  )
}

export async function updateLessonStatus(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  const { isActive } = req.body as UpdateActiveStatusBody
  sendSuccess(
    res,
    await adminLearningContentService.updateLessonStatus(actor, id, isActive),
  )
}

export async function archiveLesson(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminLearningContentService.archiveLesson(actor, id))
}

export async function restoreLesson(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminLearningContentService.restoreLesson(actor, id))
}

// --- StudyMaterial (plain metadata — file attach/replace/remove stays on
// the existing `/study-materials/:id/file` routes, see that routes file) ---

export async function listStudyMaterials(req: Request, res: Response): Promise<void> {
  const { search, subtopicId, status, page, limit } =
    req.query as unknown as ListStudyMaterialsQuery
  const result = await adminLearningContentService.listStudyMaterials(
    { search, subtopicId, status },
    page,
    limit,
  )
  sendSuccess(res, result.items, 200, pageMeta(result.total, result.page, result.limit))
}

export async function getStudyMaterial(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminLearningContentService.getStudyMaterialById(id))
}

export async function createStudyMaterial(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  sendSuccess(
    res,
    await adminLearningContentService.createStudyMaterial(
      actor,
      req.body as CreateStudyMaterialBody,
    ),
    201,
  )
}

export async function updateStudyMaterial(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(
    res,
    await adminLearningContentService.updateStudyMaterial(
      actor,
      id,
      req.body as UpdateStudyMaterialBody,
    ),
  )
}

export async function updateStudyMaterialStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  const { isActive } = req.body as UpdateActiveStatusBody
  sendSuccess(
    res,
    await adminLearningContentService.updateStudyMaterialStatus(actor, id, isActive),
  )
}

export async function archiveStudyMaterial(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminLearningContentService.archiveStudyMaterial(actor, id))
}

export async function restoreStudyMaterial(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminLearningContentService.restoreStudyMaterial(actor, id))
}
