import type { Request, Response } from 'express'

import * as adminQuestionsService from '../../services/admin/adminQuestions.service'
import * as questionBulkActionsService from '../../services/admin/questionBulkActions.service'
import * as questionVersionService from '../../services/admin/questionVersion.service'
import * as questionWorkflowService from '../../services/admin/questionWorkflow.service'
import { ApiError } from '../../utils/ApiError'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  BulkDeleteBody,
  BulkUpdateBody,
  BulkUpdatePreviewBody,
  CreateQuestionBody,
  ListQuestionsQuery,
  QuestionIdParams,
  RequestChangesBody,
  UpdateQuestionBody,
  UpdateQuestionStatusBody,
  VersionParams,
} from '../../validators/question.validator'

/** Every handler requires `req.user` — guaranteed by `authenticate` +
 * `authorizeRoles` already mounted on every `/admin/*` route
 * (`routes/admin/index.ts`); see `adminUsers.controller.ts`'s identical
 * helper for why this check exists as defensive typing, not a real path. */
function requireActor(req: Request) {
  if (!req.user) throw ApiError.unauthorized()
  return { id: req.user.sub, role: req.user.role }
}

export async function listQuestions(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListQuestionsQuery
  const result = await adminQuestionsService.listQuestions(
    {
      search: query.search,
      examId: query.examId,
      subjectId: query.subjectId,
      topicId: query.topicId,
      subtopicId: query.subtopicId,
      difficulty: query.difficulty,
      language: query.language,
      isPreviousYear: query.isPreviousYear,
      status: query.status,
    },
    query.page,
    query.limit,
  )
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / result.limit) || 1,
  })
}

export async function getQuestion(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as QuestionIdParams
  const question = await adminQuestionsService.getQuestionById(id)
  sendSuccess(res, question)
}

export async function createQuestion(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const body = req.body as CreateQuestionBody
  const question = await adminQuestionsService.createQuestion(actor, body)
  sendSuccess(res, question, 201)
}

export async function updateQuestion(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as QuestionIdParams
  const body = req.body as UpdateQuestionBody
  const question = await adminQuestionsService.updateQuestion(actor, id, body)
  sendSuccess(res, question)
}

export async function updateQuestionStatus(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as QuestionIdParams
  const { isActive } = req.body as UpdateQuestionStatusBody
  const question = await adminQuestionsService.updateQuestionStatus(actor, id, isActive)
  sendSuccess(res, question)
}

export async function archiveQuestion(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as QuestionIdParams
  const question = await adminQuestionsService.archiveQuestion(actor, id)
  sendSuccess(res, question)
}

export async function restoreQuestion(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as QuestionIdParams
  const question = await adminQuestionsService.restoreQuestion(actor, id)
  sendSuccess(res, question)
}

// --- Content Workflow (Sprint 4 Step 71.5) --------------------------------

export async function submitForReview(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as QuestionIdParams
  const question = await questionWorkflowService.submitForReview(actor, id)
  sendSuccess(res, question)
}

export async function approveQuestion(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as QuestionIdParams
  const question = await questionWorkflowService.approveQuestion(actor, id)
  sendSuccess(res, question)
}

export async function requestChanges(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as QuestionIdParams
  const { reason } = req.body as RequestChangesBody
  const question = await questionWorkflowService.requestChanges(actor, id, reason)
  sendSuccess(res, question)
}

export async function publishQuestion(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as QuestionIdParams
  const question = await questionWorkflowService.publishQuestion(actor, id)
  sendSuccess(res, question)
}

// --- Version History (Sprint 4 Step 71.5) ---------------------------------

export async function listVersions(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as QuestionIdParams
  const versions = await questionVersionService.listVersions(id)
  sendSuccess(res, versions)
}

export async function getVersion(req: Request, res: Response): Promise<void> {
  const { id, versionNumber } = req.params as unknown as VersionParams
  const version = await questionVersionService.getVersion(id, versionNumber)
  sendSuccess(res, version)
}

export async function rollback(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id, versionNumber } = req.params as unknown as VersionParams
  const question = await questionVersionService.rollback(actor, id, versionNumber)
  sendSuccess(res, question)
}

// --- Bulk Update / Bulk Delete (Sprint 4 Step 71.5) -----------------------

export async function bulkUpdatePreview(req: Request, res: Response): Promise<void> {
  const { questionIds } = req.body as BulkUpdatePreviewBody
  const result = await questionBulkActionsService.bulkUpdatePreview(questionIds)
  sendSuccess(res, result)
}

export async function bulkUpdate(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { questionIds, patch } = req.body as BulkUpdateBody
  const result = await questionBulkActionsService.bulkUpdate(actor, questionIds, patch)
  sendSuccess(res, result)
}

export async function bulkDelete(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { questionIds } = req.body as BulkDeleteBody
  const result = await questionBulkActionsService.bulkDelete(actor, questionIds)
  sendSuccess(res, result)
}

// --- Cascading filter-dropdown metadata ---

export async function listMetaExams(_req: Request, res: Response): Promise<void> {
  const exams = await adminQuestionsService.listActiveExams()
  sendSuccess(
    res,
    exams.map((exam) => ({ id: exam.id, code: exam.code, name: exam.name })),
  )
}

export async function listMetaSubjects(req: Request, res: Response): Promise<void> {
  const { examId } = req.query as { examId?: string }
  if (!examId) throw ApiError.badRequest('examId is required')
  const subjects = await adminQuestionsService.listSubjectsByExam(examId)
  sendSuccess(
    res,
    subjects.map((subject) => ({
      id: subject.id,
      slug: subject.slug,
      name: subject.name,
    })),
  )
}

export async function listMetaTopics(req: Request, res: Response): Promise<void> {
  const { subjectId } = req.query as { subjectId?: string }
  if (!subjectId) throw ApiError.badRequest('subjectId is required')
  const topics = await adminQuestionsService.listTopicsBySubject(subjectId)
  sendSuccess(
    res,
    topics.map((topic) => ({ id: topic.id, slug: topic.slug, name: topic.name })),
  )
}

export async function listMetaSubtopics(req: Request, res: Response): Promise<void> {
  const { topicId } = req.query as { topicId?: string }
  if (!topicId) throw ApiError.badRequest('topicId is required')
  const subtopics = await adminQuestionsService.listSubtopicsByTopic(topicId)
  sendSuccess(
    res,
    subtopics.map((subtopic) => ({
      id: subtopic.id,
      slug: subtopic.slug,
      name: subtopic.name,
    })),
  )
}
