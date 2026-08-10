import type { Types } from 'mongoose'

import type { Role } from '../../constants/roles'
import type { IQuestion, IQuestionOption } from '../../models/Question.model'
import type { BilingualText } from '../../models/shared/bilingualText'
import * as examRepository from '../../repositories/exam.repository'
import * as questionRepository from '../../repositories/question.repository'
import type { AdminQuestionListFilter } from '../../repositories/question.repository'
import * as subjectRepository from '../../repositories/subject.repository'
import * as subtopicRepository from '../../repositories/subtopic.repository'
import * as topicRepository from '../../repositories/topic.repository'
import * as userRepository from '../../repositories/user.repository'
import { ApiError } from '../../utils/ApiError'
import type { QuestionDocument } from '../../models/Question.model'
import type {
  CreateQuestionBody,
  UpdateQuestionBody,
} from '../../validators/question.validator'
import * as auditLogService from '../auditLog.service'

export type ActingAdmin = { id: string; role: Role }

async function resolveAuditActor(actor: ActingAdmin) {
  const actingUser = await userRepository.findById(actor.id)
  return { id: actor.id, role: actor.role, email: actingUser?.email ?? 'unknown' }
}

export interface AdminQuestionDTO {
  id: string
  examIds: string[]
  subjectId: string
  topicId: string
  subtopicId: string
  questionText: BilingualText
  questionImageUrl?: string
  options: IQuestionOption[]
  difficulty: string
  questionType: string
  explanation?: BilingualText
  source: string
  isPreviousYear: boolean
  pyqYear?: number
  tnpscExamType?: string
  tags: string[]
  isActive: boolean
  isPremium: boolean
  aiExplanationEligible: boolean
  status: 'active' | 'inactive' | 'archived'
  createdAt: Date | null
  updatedAt: Date | null
}

function toDTO(question: QuestionDocument): AdminQuestionDTO {
  const status: AdminQuestionDTO['status'] = question.deletedAt
    ? 'archived'
    : question.isActive
      ? 'active'
      : 'inactive'

  return {
    id: question.id,
    examIds: question.examIds.map((examId) => examId.toString()),
    subjectId: question.subjectId.toString(),
    topicId: question.topicId.toString(),
    subtopicId: question.subtopicId.toString(),
    questionText: question.questionText,
    questionImageUrl: question.questionImageUrl,
    options: question.options,
    difficulty: question.difficulty,
    questionType: question.questionType,
    explanation: question.explanation,
    source: question.source,
    isPreviousYear: question.isPreviousYear,
    pyqYear: question.pyqYear,
    tnpscExamType: question.tnpscExamType,
    tags: question.tags,
    isActive: question.isActive,
    isPremium: question.isPremium,
    aiExplanationEligible: question.aiExplanationEligible,
    status,
    createdAt: question.createdAt ?? null,
    updatedAt: question.updatedAt ?? null,
  }
}

/**
 * Reference validation (Step 53's "reference validation" requirement, shared
 * by the direct CRUD endpoints and the Bulk Import parser): every exam id
 * must resolve to a real, existing `Exam`; subject/topic/subtopic must
 * resolve to real, *active* content nodes; and the topic/subtopic must
 * actually belong to the given subject/topic — a question with an
 * inconsistent hierarchy would silently never be found by any of Learn's or
 * Practice's subject/topic-scoped queries.
 */
export async function validateQuestionReferences(input: {
  examIds: (Types.ObjectId | string)[]
  subjectId: Types.ObjectId | string
  topicId: Types.ObjectId | string
  subtopicId: Types.ObjectId | string
}): Promise<void> {
  const exams = await Promise.all(
    input.examIds.map((examId) => examRepository.findById(examId)),
  )
  const missingExamIndex = exams.findIndex((exam) => !exam)
  if (missingExamIndex !== -1) {
    throw ApiError.badRequest(
      `examIds[${missingExamIndex}] does not reference a real exam`,
    )
  }

  const [subject, topic, subtopic] = await Promise.all([
    subjectRepository.findById(input.subjectId),
    topicRepository.findById(input.topicId),
    subtopicRepository.findById(input.subtopicId),
  ])
  if (!subject)
    throw ApiError.badRequest('subjectId does not reference a real, active subject')
  if (!topic) throw ApiError.badRequest('topicId does not reference a real, active topic')
  if (!subtopic) {
    throw ApiError.badRequest('subtopicId does not reference a real, active subtopic')
  }
  if (topic.subjectId.toString() !== subject.id) {
    throw ApiError.badRequest('topicId does not belong to subjectId')
  }
  if (subtopic.topicId.toString() !== topic.id) {
    throw ApiError.badRequest('subtopicId does not belong to topicId')
  }
}

export async function listQuestions(
  filter: AdminQuestionListFilter,
  page: number,
  limit: number,
): Promise<{ items: AdminQuestionDTO[]; total: number; page: number; limit: number }> {
  const { items, total } = await questionRepository.listForAdmin(filter, page, limit)
  return { items: items.map(toDTO), total, page, limit }
}

export async function getQuestionById(id: string): Promise<AdminQuestionDTO> {
  const question = await questionRepository.findByIdIncludingArchived(id)
  if (!question) throw ApiError.notFound('Question not found')
  return toDTO(question)
}

export async function createQuestion(
  actor: ActingAdmin,
  data: CreateQuestionBody,
): Promise<AdminQuestionDTO> {
  await validateQuestionReferences(data)

  // Zod's `objectIdSchema` already confirmed every id here is a
  // well-formed ObjectId string (`isValidObjectId`) — Mongoose casts them
  // correctly at runtime; the cast just bridges past `IQuestion`'s stricter
  // `Types.ObjectId` typing for what's still plain validated request input.
  const question = await questionRepository.create(data as unknown as Partial<IQuestion>)

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'question.create',
    'Question',
    question.id,
    {
      subjectId: data.subjectId,
      topicId: data.topicId,
      subtopicId: data.subtopicId,
    },
  )

  return toDTO(question)
}

export async function updateQuestion(
  actor: ActingAdmin,
  id: string,
  data: UpdateQuestionBody,
): Promise<AdminQuestionDTO> {
  const existing = await questionRepository.findByIdForAdmin(id)
  if (!existing) throw ApiError.notFound('Question not found')

  await validateQuestionReferences({
    examIds: data.examIds ?? existing.examIds,
    subjectId: data.subjectId ?? existing.subjectId,
    topicId: data.topicId ?? existing.topicId,
    subtopicId: data.subtopicId ?? existing.subtopicId,
  })

  const updated = await questionRepository.updateById(
    id,
    data as unknown as Partial<IQuestion>,
  )
  if (!updated) throw ApiError.notFound('Question not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'question.update', 'Question', id, {
    fields: Object.keys(data),
  })

  return toDTO(updated)
}

export async function updateQuestionStatus(
  actor: ActingAdmin,
  id: string,
  isActive: boolean,
): Promise<AdminQuestionDTO> {
  const updated = await questionRepository.updateActiveStatus(id, isActive)
  if (!updated) throw ApiError.notFound('Question not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'question.status.update',
    'Question',
    id,
    { isActive },
  )

  return toDTO(updated)
}

export async function archiveQuestion(
  actor: ActingAdmin,
  id: string,
): Promise<AdminQuestionDTO> {
  const updated = await questionRepository.archive(id)
  if (!updated) throw ApiError.notFound('Question not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'question.archive', 'Question', id)

  return toDTO(updated)
}

export async function restoreQuestion(
  actor: ActingAdmin,
  id: string,
): Promise<AdminQuestionDTO> {
  const updated = await questionRepository.restore(id)
  if (!updated) throw ApiError.notFound('Archived question not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'question.restore', 'Question', id)

  return toDTO(updated)
}

// --- Filter-dropdown lookups (cascading exam -> subject -> topic -> subtopic) ---

export function listActiveExams() {
  return examRepository.findAllActive()
}

export function listSubjectsByExam(examId: string) {
  return subjectRepository.findByExam(examId)
}

export function listTopicsBySubject(subjectId: string) {
  return topicRepository.findBySubject(subjectId)
}

export function listSubtopicsByTopic(topicId: string) {
  return subtopicRepository.findByTopic(topicId)
}
