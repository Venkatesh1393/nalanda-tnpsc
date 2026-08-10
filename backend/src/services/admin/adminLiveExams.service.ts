import type { LiveExamStatus } from '../../constants/liveExam'
import type { Role } from '../../constants/roles'
import type {
  BilingualParagraphs,
  BilingualText,
} from '../../models/shared/bilingualText'
import type { ILiveExam, LiveExamDocument } from '../../models/LiveExam.model'
import * as examRepository from '../../repositories/exam.repository'
import * as liveExamRepository from '../../repositories/liveExam.repository'
import type { AdminLiveExamListFilter } from '../../repositories/liveExam.repository'
import * as liveExamAttemptRepository from '../../repositories/liveExamAttempt.repository'
import * as questionRepository from '../../repositories/question.repository'
import * as subjectRepository from '../../repositories/subject.repository'
import * as userRepository from '../../repositories/user.repository'
import { ApiError } from '../../utils/ApiError'
import { computeEffectiveStatus, type LiveExamEffectiveStatus } from '../liveExam.service'
import type {
  CreateLiveExamBody,
  UpdateLiveExamBody,
} from '../../validators/liveExam.validator'
import * as auditLogService from '../auditLog.service'

export type ActingAdmin = { id: string; role: Role }

async function resolveAuditActor(actor: ActingAdmin) {
  const actingUser = await userRepository.findById(actor.id)
  return { id: actor.id, role: actor.role, email: actingUser?.email ?? 'unknown' }
}

export interface AdminLiveExamDTO {
  id: string
  title: BilingualText
  description: BilingualText
  examId: string
  subjectIds: string[]
  questionIds: string[]
  scheduledStartAt: Date
  scheduledEndAt: Date
  durationMinutes: number
  totalQuestions: number
  totalMarks: number
  marksPerQuestion: number
  negativeMarking: { enabled: boolean; marksPerWrongAnswer: number }
  instructions: BilingualParagraphs
  resultPublication: { mode: string; publishAt: Date | null; publishedAt: Date | null }
  status: LiveExamStatus
  effectiveStatus: LiveExamEffectiveStatus
  attemptCount: number
  createdAt: Date | null
  updatedAt: Date | null
}

async function toDTO(exam: LiveExamDocument): Promise<AdminLiveExamDTO> {
  const attemptCount = await liveExamAttemptRepository.countByLiveExam(exam.id)
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    examId: exam.examId.toString(),
    subjectIds: exam.subjectIds.map((id) => id.toString()),
    questionIds: exam.questionIds.map((id) => id.toString()),
    scheduledStartAt: exam.scheduledStartAt,
    scheduledEndAt: exam.scheduledEndAt,
    durationMinutes: exam.durationMinutes,
    totalQuestions: exam.totalQuestions,
    totalMarks: exam.totalMarks,
    marksPerQuestion: exam.marksPerQuestion,
    negativeMarking: {
      enabled: exam.negativeMarking.enabled,
      marksPerWrongAnswer: exam.negativeMarking.marksPerWrongAnswer,
    },
    instructions: exam.instructions,
    resultPublication: {
      mode: exam.resultPublication.mode,
      publishAt: exam.resultPublication.publishAt ?? null,
      publishedAt: exam.resultPublication.publishedAt ?? null,
    },
    status: exam.status,
    effectiveStatus: computeEffectiveStatus(exam, new Date()),
    attemptCount,
    createdAt: exam.createdAt ?? null,
    updatedAt: exam.updatedAt ?? null,
  }
}

export async function listLiveExams(
  filter: AdminLiveExamListFilter,
  page: number,
  limit: number,
): Promise<{ items: AdminLiveExamDTO[]; total: number; page: number; limit: number }> {
  const { items, total } = await liveExamRepository.listForAdmin(filter, page, limit)
  return { items: await Promise.all(items.map(toDTO)), total, page, limit }
}

export async function getLiveExamById(id: string): Promise<AdminLiveExamDTO> {
  const exam = await liveExamRepository.findByIdForAdmin(id)
  if (!exam) throw ApiError.notFound('Live exam not found')
  return toDTO(exam)
}

async function requireExamExists(examId: string): Promise<void> {
  const exam = await examRepository.findById(examId)
  if (!exam) throw ApiError.badRequest('examId does not reference a real exam')
}

async function requireSubjectsExist(subjectIds: string[]): Promise<void> {
  const subjects = await Promise.all(
    subjectIds.map((id) => subjectRepository.findById(id)),
  )
  const missingIndex = subjects.findIndex((subject) => !subject)
  if (missingIndex !== -1) {
    throw ApiError.badRequest(
      `subjectIds[${missingIndex}] does not reference a real subject`,
    )
  }
}

async function requireQuestionsExist(questionIds: string[]): Promise<void> {
  const questions = await questionRepository.findByIds(questionIds)
  if (questions.length !== questionIds.length) {
    throw ApiError.badRequest('questionIds contains one or more ids that do not exist')
  }
}

/**
 * `totalQuestions`/`totalMarks` are always derived here, never trusted from
 * the request body (the validator doesn't even accept them) — this is the
 * one place they're computed, so they can never drift out of sync with
 * `questionIds.length`/`marksPerQuestion`.
 */
export async function createLiveExam(
  actor: ActingAdmin,
  data: CreateLiveExamBody,
): Promise<AdminLiveExamDTO> {
  await Promise.all([
    requireExamExists(data.examId),
    requireSubjectsExist(data.subjectIds),
    requireQuestionsExist(data.questionIds),
  ])

  const exam = await liveExamRepository.create({
    ...data,
    totalQuestions: data.questionIds.length,
    totalMarks: data.questionIds.length * data.marksPerQuestion,
    status: 'draft',
  } as unknown as Partial<ILiveExam>)

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'liveExam.create', 'LiveExam', exam.id, {
    examId: data.examId,
    questionCount: data.questionIds.length,
  })
  return toDTO(exam)
}

export async function updateLiveExam(
  actor: ActingAdmin,
  id: string,
  data: UpdateLiveExamBody,
): Promise<AdminLiveExamDTO> {
  const existing = await liveExamRepository.findByIdForAdmin(id)
  if (!existing) throw ApiError.notFound('Live exam not found')

  await Promise.all([
    data.examId ? requireExamExists(data.examId) : Promise.resolve(),
    data.subjectIds ? requireSubjectsExist(data.subjectIds) : Promise.resolve(),
    data.questionIds ? requireQuestionsExist(data.questionIds) : Promise.resolve(),
  ])

  const questionIds = data.questionIds ?? existing.questionIds.map((id) => id.toString())
  const marksPerQuestion = data.marksPerQuestion ?? existing.marksPerQuestion

  const updated = await liveExamRepository.updateById(id, {
    ...data,
    totalQuestions: questionIds.length,
    totalMarks: questionIds.length * marksPerQuestion,
  } as unknown as Partial<ILiveExam>)
  if (!updated) throw ApiError.notFound('Live exam not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'liveExam.update', 'LiveExam', id, {
    fields: Object.keys(data),
  })
  return toDTO(updated)
}

/** `draft` → `scheduled` only — the sole status transition that flips a
 * Live Exam from invisible to student-visible (`findByTab`/`findById`'s
 * `status !== 'draft'` gate). */
export async function publishLiveExam(
  actor: ActingAdmin,
  id: string,
): Promise<AdminLiveExamDTO> {
  const exam = await liveExamRepository.findByIdForAdmin(id)
  if (!exam) throw ApiError.notFound('Live exam not found')
  if (exam.status !== 'draft') {
    throw ApiError.badRequest(
      `Only a draft exam can be published (current status: ${exam.status}).`,
    )
  }

  const updated = await liveExamRepository.updateStatus(id, 'scheduled')
  if (!updated) throw ApiError.notFound('Live exam not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'liveExam.publish', 'LiveExam', id)
  return toDTO(updated)
}

export async function cancelLiveExam(
  actor: ActingAdmin,
  id: string,
): Promise<AdminLiveExamDTO> {
  const exam = await liveExamRepository.findByIdForAdmin(id)
  if (!exam) throw ApiError.notFound('Live exam not found')
  if (exam.status === 'cancelled') return toDTO(exam)

  const updated = await liveExamRepository.updateStatus(id, 'cancelled')
  if (!updated) throw ApiError.notFound('Live exam not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'liveExam.cancel', 'LiveExam', id)
  return toDTO(updated)
}

/**
 * The manual results-publish override (Step 54) — only allowed once the
 * exam has genuinely finished (`effectiveStatus` is `completed` or
 * `cancelled`), so results can never leak to a student still mid-exam;
 * within that window, an admin may release results early relative to a
 * `scheduled` `publishAt`, or ahead of the default `immediate`-at-end
 * timing having actually run.
 */
export async function publishLiveExamResults(
  actor: ActingAdmin,
  id: string,
): Promise<AdminLiveExamDTO> {
  const exam = await liveExamRepository.findByIdForAdmin(id)
  if (!exam) throw ApiError.notFound('Live exam not found')

  const effectiveStatus = computeEffectiveStatus(exam, new Date())
  if (effectiveStatus !== 'completed' && effectiveStatus !== 'cancelled') {
    throw ApiError.badRequest('Results can only be published once the exam has ended.')
  }

  const updated = await liveExamRepository.updateResultPublishedAt(id, new Date())
  if (!updated) throw ApiError.notFound('Live exam not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'liveExam.publishResults',
    'LiveExam',
    id,
  )
  return toDTO(updated)
}
