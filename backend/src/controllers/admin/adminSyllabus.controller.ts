import type { Request, Response } from 'express'

import * as adminSyllabusService from '../../services/admin/adminSyllabus.service'
import { ApiError } from '../../utils/ApiError'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  CreateExamBody,
  CreateSubjectBody,
  CreateSubtopicBody,
  CreateTopicBody,
  IdParams,
  ListExamsQuery,
  ListSubjectsQuery,
  ListSubtopicsQuery,
  ListTopicsQuery,
  UpdateActiveStatusBody,
  UpdateExamBody,
  UpdateSubjectBody,
  UpdateSubtopicBody,
  UpdateTopicBody,
} from '../../validators/contentHierarchy.validator'

function requireActor(req: Request) {
  if (!req.user) throw ApiError.unauthorized()
  return { id: req.user.sub, role: req.user.role }
}

function pageMeta(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
}

// --- Exam ---

export async function listExams(req: Request, res: Response): Promise<void> {
  const { search, status, page, limit } = req.query as unknown as ListExamsQuery
  const result = await adminSyllabusService.listExams({ search, status }, page, limit)
  sendSuccess(res, result.items, 200, pageMeta(result.total, result.page, result.limit))
}

export async function getExam(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminSyllabusService.getExamById(id))
}

export async function createExam(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  sendSuccess(
    res,
    await adminSyllabusService.createExam(actor, req.body as CreateExamBody),
    201,
  )
}

export async function updateExam(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(
    res,
    await adminSyllabusService.updateExam(actor, id, req.body as UpdateExamBody),
  )
}

export async function updateExamStatus(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  const { isActive } = req.body as UpdateActiveStatusBody
  sendSuccess(res, await adminSyllabusService.updateExamStatus(actor, id, isActive))
}

// --- Subject ---

export async function listSubjects(req: Request, res: Response): Promise<void> {
  const { search, examId, status, page, limit } =
    req.query as unknown as ListSubjectsQuery
  const result = await adminSyllabusService.listSubjects(
    { search, examId, status },
    page,
    limit,
  )
  sendSuccess(res, result.items, 200, pageMeta(result.total, result.page, result.limit))
}

export async function getSubject(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminSyllabusService.getSubjectById(id))
}

export async function createSubject(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  sendSuccess(
    res,
    await adminSyllabusService.createSubject(actor, req.body as CreateSubjectBody),
    201,
  )
}

export async function updateSubject(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(
    res,
    await adminSyllabusService.updateSubject(actor, id, req.body as UpdateSubjectBody),
  )
}

export async function updateSubjectStatus(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  const { isActive } = req.body as UpdateActiveStatusBody
  sendSuccess(res, await adminSyllabusService.updateSubjectStatus(actor, id, isActive))
}

export async function archiveSubject(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminSyllabusService.archiveSubject(actor, id))
}

export async function restoreSubject(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminSyllabusService.restoreSubject(actor, id))
}

// --- Topic ---

export async function listTopics(req: Request, res: Response): Promise<void> {
  const { search, subjectId, status, page, limit } =
    req.query as unknown as ListTopicsQuery
  const result = await adminSyllabusService.listTopics(
    { search, subjectId, status },
    page,
    limit,
  )
  sendSuccess(res, result.items, 200, pageMeta(result.total, result.page, result.limit))
}

export async function getTopic(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminSyllabusService.getTopicById(id))
}

export async function createTopic(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  sendSuccess(
    res,
    await adminSyllabusService.createTopic(actor, req.body as CreateTopicBody),
    201,
  )
}

export async function updateTopic(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(
    res,
    await adminSyllabusService.updateTopic(actor, id, req.body as UpdateTopicBody),
  )
}

export async function updateTopicStatus(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  const { isActive } = req.body as UpdateActiveStatusBody
  sendSuccess(res, await adminSyllabusService.updateTopicStatus(actor, id, isActive))
}

export async function archiveTopic(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminSyllabusService.archiveTopic(actor, id))
}

export async function restoreTopic(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminSyllabusService.restoreTopic(actor, id))
}

// --- Subtopic ---

export async function listSubtopics(req: Request, res: Response): Promise<void> {
  const { search, topicId, status, page, limit } =
    req.query as unknown as ListSubtopicsQuery
  const result = await adminSyllabusService.listSubtopics(
    { search, topicId, status },
    page,
    limit,
  )
  sendSuccess(res, result.items, 200, pageMeta(result.total, result.page, result.limit))
}

export async function getSubtopic(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminSyllabusService.getSubtopicById(id))
}

export async function createSubtopic(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  sendSuccess(
    res,
    await adminSyllabusService.createSubtopic(actor, req.body as CreateSubtopicBody),
    201,
  )
}

export async function updateSubtopic(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(
    res,
    await adminSyllabusService.updateSubtopic(actor, id, req.body as UpdateSubtopicBody),
  )
}

export async function updateSubtopicStatus(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  const { isActive } = req.body as UpdateActiveStatusBody
  sendSuccess(res, await adminSyllabusService.updateSubtopicStatus(actor, id, isActive))
}

export async function archiveSubtopic(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminSyllabusService.archiveSubtopic(actor, id))
}

export async function restoreSubtopic(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as IdParams
  sendSuccess(res, await adminSyllabusService.restoreSubtopic(actor, id))
}
