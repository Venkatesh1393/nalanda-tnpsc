import type { Request, Response } from 'express'

import * as adminQuestionsService from '../../services/admin/adminQuestions.service'
import { ApiError } from '../../utils/ApiError'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  CreateQuestionBody,
  ListQuestionsQuery,
  QuestionIdParams,
  UpdateQuestionBody,
  UpdateQuestionStatusBody,
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
