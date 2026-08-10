import type { Role } from '../../constants/roles'
import type { ExamDocument } from '../../models/Exam.model'
import type { ISubject, SubjectDocument } from '../../models/Subject.model'
import type { ISubtopic, SubtopicDocument } from '../../models/Subtopic.model'
import type { ITopic, TopicDocument } from '../../models/Topic.model'
import * as examRepository from '../../repositories/exam.repository'
import type { AdminExamListFilter } from '../../repositories/exam.repository'
import * as lessonRepository from '../../repositories/lesson.repository'
import * as studyMaterialRepository from '../../repositories/studyMaterial.repository'
import * as subjectRepository from '../../repositories/subject.repository'
import type { AdminSubjectListFilter } from '../../repositories/subject.repository'
import * as subtopicRepository from '../../repositories/subtopic.repository'
import type { AdminSubtopicListFilter } from '../../repositories/subtopic.repository'
import * as topicRepository from '../../repositories/topic.repository'
import type { AdminTopicListFilter } from '../../repositories/topic.repository'
import * as userRepository from '../../repositories/user.repository'
import { ApiError } from '../../utils/ApiError'
import type {
  CreateExamBody,
  CreateSubjectBody,
  CreateSubtopicBody,
  CreateTopicBody,
  UpdateExamBody,
  UpdateSubjectBody,
  UpdateSubtopicBody,
  UpdateTopicBody,
} from '../../validators/contentHierarchy.validator'
import * as auditLogService from '../auditLog.service'
import { invalidateExamCodeCache, invalidateLearnCache } from '../learn.service'

export type ActingAdmin = { id: string; role: Role }

async function resolveAuditActor(actor: ActingAdmin) {
  const actingUser = await userRepository.findById(actor.id)
  return { id: actor.id, role: actor.role, email: actingUser?.email ?? 'unknown' }
}

type ContentStatus = 'active' | 'inactive' | 'archived'

function statusOf(deletedAt: Date | null, isActive: boolean): ContentStatus {
  return deletedAt ? 'archived' : isActive ? 'active' : 'inactive'
}

// =========================================================================
// Exam — no soft-delete plugin (see Exam.model.ts), so only activate/
// deactivate applies, never archive/restore.
// =========================================================================

export interface AdminExamDTO {
  id: string
  code: string
  name: { en?: string; ta?: string }
  description?: { en?: string; ta?: string }
  icon?: string
  order: number
  isActive: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

function toExamDTO(exam: ExamDocument): AdminExamDTO {
  return {
    id: exam.id,
    code: exam.code,
    name: exam.name,
    description: exam.description,
    icon: exam.icon,
    order: exam.order,
    isActive: exam.isActive,
    createdAt: exam.createdAt ?? null,
    updatedAt: exam.updatedAt ?? null,
  }
}

export async function listExams(
  filter: AdminExamListFilter,
  page: number,
  limit: number,
): Promise<{ items: AdminExamDTO[]; total: number; page: number; limit: number }> {
  const { items, total } = await examRepository.listForAdmin(filter, page, limit)
  return { items: items.map(toExamDTO), total, page, limit }
}

export async function getExamById(id: string): Promise<AdminExamDTO> {
  const exam = await examRepository.findById(id)
  if (!exam) throw ApiError.notFound('Exam not found')
  return toExamDTO(exam)
}

export async function createExam(
  actor: ActingAdmin,
  data: CreateExamBody,
): Promise<AdminExamDTO> {
  const existing = await examRepository.findByCode(data.code)
  if (existing)
    throw ApiError.conflict(`An exam with code "${data.code}" already exists.`)

  const exam = await examRepository.create(data)
  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'exam.create', 'Exam', exam.id, {
    code: data.code,
  })
  return toExamDTO(exam)
}

export async function updateExam(
  actor: ActingAdmin,
  id: string,
  data: UpdateExamBody,
): Promise<AdminExamDTO> {
  const updated = await examRepository.updateById(id, data)
  if (!updated) throw ApiError.notFound('Exam not found')
  await invalidateExamCodeCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'exam.update', 'Exam', id, {
    fields: Object.keys(data),
  })
  return toExamDTO(updated)
}

export async function updateExamStatus(
  actor: ActingAdmin,
  id: string,
  isActive: boolean,
): Promise<AdminExamDTO> {
  const updated = await examRepository.updateActiveStatus(id, isActive)
  if (!updated) throw ApiError.notFound('Exam not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'exam.status.update', 'Exam', id, {
    isActive,
  })
  return toExamDTO(updated)
}

// =========================================================================
// Subject
// =========================================================================

export interface AdminSubjectDTO {
  id: string
  slug: string
  name: { en?: string; ta?: string }
  examIds: string[]
  order: number
  icon?: string
  isActive: boolean
  status: ContentStatus
  createdAt: Date | null
  updatedAt: Date | null
}

function toSubjectDTO(subject: SubjectDocument): AdminSubjectDTO {
  return {
    id: subject.id,
    slug: subject.slug,
    name: subject.name,
    examIds: subject.examIds.map((id) => id.toString()),
    order: subject.order,
    icon: subject.icon,
    isActive: subject.isActive,
    status: statusOf(subject.deletedAt, subject.isActive),
    createdAt: subject.createdAt ?? null,
    updatedAt: subject.updatedAt ?? null,
  }
}

export async function listSubjects(
  filter: AdminSubjectListFilter,
  page: number,
  limit: number,
): Promise<{ items: AdminSubjectDTO[]; total: number; page: number; limit: number }> {
  const { items, total } = await subjectRepository.listForAdmin(filter, page, limit)
  return { items: items.map(toSubjectDTO), total, page, limit }
}

export async function getSubjectById(id: string): Promise<AdminSubjectDTO> {
  const subject = await subjectRepository.findByIdIncludingArchived(id)
  if (!subject) throw ApiError.notFound('Subject not found')
  return toSubjectDTO(subject)
}

async function requireExamsExist(examIds: string[]): Promise<void> {
  const exams = await Promise.all(examIds.map((id) => examRepository.findById(id)))
  const missingIndex = exams.findIndex((exam) => !exam)
  if (missingIndex !== -1) {
    throw ApiError.badRequest(`examIds[${missingIndex}] does not reference a real exam`)
  }
}

export async function createSubject(
  actor: ActingAdmin,
  data: CreateSubjectBody,
): Promise<AdminSubjectDTO> {
  await requireExamsExist(data.examIds)

  // Zod's `objectIdSchema` already confirmed every id here is well-formed —
  // Mongoose casts the strings correctly at runtime; this bridges past
  // `ISubject`'s stricter `Types.ObjectId` typing for validated input.
  const subject = await subjectRepository.create(data as unknown as Partial<ISubject>)
  await invalidateLearnCache()
  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'subject.create',
    'Subject',
    subject.id,
    {
      slug: data.slug,
    },
  )
  return toSubjectDTO(subject)
}

export async function updateSubject(
  actor: ActingAdmin,
  id: string,
  data: UpdateSubjectBody,
): Promise<AdminSubjectDTO> {
  if (data.examIds) await requireExamsExist(data.examIds)

  const updated = await subjectRepository.updateById(
    id,
    data as unknown as Partial<ISubject>,
  )
  if (!updated) throw ApiError.notFound('Subject not found')
  await invalidateLearnCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'subject.update', 'Subject', id, {
    fields: Object.keys(data),
  })
  return toSubjectDTO(updated)
}

/** Blocks deactivate/archive when active, non-archived Topics still exist
 * under this Subject — Step 54's explicit "prevent deleting parent content
 * when dependent content would become orphaned" requirement. Deliberately
 * bottom-up: the admin must deactivate/archive the children first. */
async function guardSubjectHasNoActiveChildren(subjectId: string): Promise<void> {
  const activeTopicCount = await topicRepository.countBySubject(subjectId)
  if (activeTopicCount > 0) {
    throw ApiError.conflict(
      `This subject has ${activeTopicCount} active topic(s). Deactivate or archive them first.`,
    )
  }
}

export async function updateSubjectStatus(
  actor: ActingAdmin,
  id: string,
  isActive: boolean,
): Promise<AdminSubjectDTO> {
  if (!isActive) await guardSubjectHasNoActiveChildren(id)

  const updated = await subjectRepository.updateActiveStatus(id, isActive)
  if (!updated) throw ApiError.notFound('Subject not found')
  await invalidateLearnCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'subject.status.update', 'Subject', id, {
    isActive,
  })
  return toSubjectDTO(updated)
}

export async function archiveSubject(
  actor: ActingAdmin,
  id: string,
): Promise<AdminSubjectDTO> {
  await guardSubjectHasNoActiveChildren(id)

  const updated = await subjectRepository.archive(id)
  if (!updated) throw ApiError.notFound('Subject not found')
  await invalidateLearnCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'subject.archive', 'Subject', id)
  return toSubjectDTO(updated)
}

export async function restoreSubject(
  actor: ActingAdmin,
  id: string,
): Promise<AdminSubjectDTO> {
  const updated = await subjectRepository.restore(id)
  if (!updated) throw ApiError.notFound('Archived subject not found')
  await invalidateLearnCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'subject.restore', 'Subject', id)
  return toSubjectDTO(updated)
}

// =========================================================================
// Topic — `examIds` always denormalized server-side from the parent Subject.
// =========================================================================

export interface AdminTopicDTO {
  id: string
  slug: string
  subjectId: string
  examIds: string[]
  name: { en?: string; ta?: string }
  order: number
  isActive: boolean
  status: ContentStatus
  createdAt: Date | null
  updatedAt: Date | null
}

function toTopicDTO(topic: TopicDocument): AdminTopicDTO {
  return {
    id: topic.id,
    slug: topic.slug,
    subjectId: topic.subjectId.toString(),
    examIds: topic.examIds.map((id) => id.toString()),
    name: topic.name,
    order: topic.order,
    isActive: topic.isActive,
    status: statusOf(topic.deletedAt, topic.isActive),
    createdAt: topic.createdAt ?? null,
    updatedAt: topic.updatedAt ?? null,
  }
}

async function requireParentSubject(subjectId: string): Promise<SubjectDocument> {
  const subject = await subjectRepository.findByIdIncludingArchived(subjectId)
  if (!subject || subject.deletedAt) {
    throw ApiError.badRequest('subjectId does not reference a real, non-archived subject')
  }
  return subject
}

export async function listTopics(
  filter: AdminTopicListFilter,
  page: number,
  limit: number,
): Promise<{ items: AdminTopicDTO[]; total: number; page: number; limit: number }> {
  const { items, total } = await topicRepository.listForAdmin(filter, page, limit)
  return { items: items.map(toTopicDTO), total, page, limit }
}

export async function getTopicById(id: string): Promise<AdminTopicDTO> {
  const topic = await topicRepository.findByIdIncludingArchived(id)
  if (!topic) throw ApiError.notFound('Topic not found')
  return toTopicDTO(topic)
}

export async function createTopic(
  actor: ActingAdmin,
  data: CreateTopicBody,
): Promise<AdminTopicDTO> {
  const subject = await requireParentSubject(data.subjectId)

  const topic = await topicRepository.create({
    ...data,
    examIds: subject.examIds,
  } as unknown as Partial<ITopic>)
  await invalidateLearnCache()
  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'topic.create', 'Topic', topic.id, {
    slug: data.slug,
    subjectId: data.subjectId,
  })
  return toTopicDTO(topic)
}

export async function updateTopic(
  actor: ActingAdmin,
  id: string,
  data: UpdateTopicBody,
): Promise<AdminTopicDTO> {
  const patch: UpdateTopicBody & { examIds?: string[] } = { ...data }
  if (data.subjectId) {
    const subject = await requireParentSubject(data.subjectId)
    patch.examIds = subject.examIds.map((examId) => examId.toString())
  }

  const updated = await topicRepository.updateById(
    id,
    patch as unknown as Partial<ITopic>,
  )
  if (!updated) throw ApiError.notFound('Topic not found')
  await invalidateLearnCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'topic.update', 'Topic', id, {
    fields: Object.keys(data),
  })
  return toTopicDTO(updated)
}

async function guardTopicHasNoActiveChildren(topicId: string): Promise<void> {
  const activeSubtopicCount = await subtopicRepository.countByTopic(topicId)
  if (activeSubtopicCount > 0) {
    throw ApiError.conflict(
      `This topic has ${activeSubtopicCount} active subtopic(s). Deactivate or archive them first.`,
    )
  }
}

export async function updateTopicStatus(
  actor: ActingAdmin,
  id: string,
  isActive: boolean,
): Promise<AdminTopicDTO> {
  if (!isActive) await guardTopicHasNoActiveChildren(id)

  const updated = await topicRepository.updateActiveStatus(id, isActive)
  if (!updated) throw ApiError.notFound('Topic not found')
  await invalidateLearnCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'topic.status.update', 'Topic', id, {
    isActive,
  })
  return toTopicDTO(updated)
}

export async function archiveTopic(
  actor: ActingAdmin,
  id: string,
): Promise<AdminTopicDTO> {
  await guardTopicHasNoActiveChildren(id)

  const updated = await topicRepository.archive(id)
  if (!updated) throw ApiError.notFound('Topic not found')
  await invalidateLearnCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'topic.archive', 'Topic', id)
  return toTopicDTO(updated)
}

export async function restoreTopic(
  actor: ActingAdmin,
  id: string,
): Promise<AdminTopicDTO> {
  const updated = await topicRepository.restore(id)
  if (!updated) throw ApiError.notFound('Archived topic not found')
  await invalidateLearnCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'topic.restore', 'Topic', id)
  return toTopicDTO(updated)
}

// =========================================================================
// Subtopic — `subjectId`/`examIds` always denormalized server-side from the
// parent Topic.
// =========================================================================

export interface AdminSubtopicDTO {
  id: string
  slug: string
  topicId: string
  subjectId: string
  examIds: string[]
  name: { en?: string; ta?: string }
  order: number
  estimatedMinutes?: number
  isActive: boolean
  status: ContentStatus
  createdAt: Date | null
  updatedAt: Date | null
}

function toSubtopicDTO(subtopic: SubtopicDocument): AdminSubtopicDTO {
  return {
    id: subtopic.id,
    slug: subtopic.slug,
    topicId: subtopic.topicId.toString(),
    subjectId: subtopic.subjectId.toString(),
    examIds: subtopic.examIds.map((id) => id.toString()),
    name: subtopic.name,
    order: subtopic.order,
    estimatedMinutes: subtopic.estimatedMinutes,
    isActive: subtopic.isActive,
    status: statusOf(subtopic.deletedAt, subtopic.isActive),
    createdAt: subtopic.createdAt ?? null,
    updatedAt: subtopic.updatedAt ?? null,
  }
}

async function requireParentTopic(topicId: string): Promise<TopicDocument> {
  const topic = await topicRepository.findByIdIncludingArchived(topicId)
  if (!topic || topic.deletedAt) {
    throw ApiError.badRequest('topicId does not reference a real, non-archived topic')
  }
  return topic
}

export async function listSubtopics(
  filter: AdminSubtopicListFilter,
  page: number,
  limit: number,
): Promise<{ items: AdminSubtopicDTO[]; total: number; page: number; limit: number }> {
  const { items, total } = await subtopicRepository.listForAdmin(filter, page, limit)
  return { items: items.map(toSubtopicDTO), total, page, limit }
}

export async function getSubtopicById(id: string): Promise<AdminSubtopicDTO> {
  const subtopic = await subtopicRepository.findByIdIncludingArchived(id)
  if (!subtopic) throw ApiError.notFound('Subtopic not found')
  return toSubtopicDTO(subtopic)
}

export async function createSubtopic(
  actor: ActingAdmin,
  data: CreateSubtopicBody,
): Promise<AdminSubtopicDTO> {
  const topic = await requireParentTopic(data.topicId)

  const subtopic = await subtopicRepository.create({
    ...data,
    subjectId: topic.subjectId,
    examIds: topic.examIds,
  } as unknown as Partial<ISubtopic>)
  await invalidateLearnCache()
  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'subtopic.create',
    'Subtopic',
    subtopic.id,
    {
      slug: data.slug,
      topicId: data.topicId,
    },
  )
  return toSubtopicDTO(subtopic)
}

export async function updateSubtopic(
  actor: ActingAdmin,
  id: string,
  data: UpdateSubtopicBody,
): Promise<AdminSubtopicDTO> {
  const patch: UpdateSubtopicBody & { subjectId?: string; examIds?: string[] } = {
    ...data,
  }
  if (data.topicId) {
    const topic = await requireParentTopic(data.topicId)
    patch.subjectId = topic.subjectId.toString()
    patch.examIds = topic.examIds.map((examId) => examId.toString())
  }

  const updated = await subtopicRepository.updateById(
    id,
    patch as unknown as Partial<ISubtopic>,
  )
  if (!updated) throw ApiError.notFound('Subtopic not found')
  await invalidateLearnCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'subtopic.update', 'Subtopic', id, {
    fields: Object.keys(data),
  })
  return toSubtopicDTO(updated)
}

async function guardSubtopicHasNoActiveChildren(subtopicId: string): Promise<void> {
  const [lessonCount, studyMaterialCount] = await Promise.all([
    lessonRepository.countBySubtopic(subtopicId),
    studyMaterialRepository.countBySubtopic(subtopicId),
  ])
  if (lessonCount > 0 || studyMaterialCount > 0) {
    throw ApiError.conflict(
      `This subtopic has ${lessonCount} active lesson(s) and ${studyMaterialCount} active study material(s). Deactivate or archive them first.`,
    )
  }
}

export async function updateSubtopicStatus(
  actor: ActingAdmin,
  id: string,
  isActive: boolean,
): Promise<AdminSubtopicDTO> {
  if (!isActive) await guardSubtopicHasNoActiveChildren(id)

  const updated = await subtopicRepository.updateActiveStatus(id, isActive)
  if (!updated) throw ApiError.notFound('Subtopic not found')
  await invalidateLearnCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'subtopic.status.update',
    'Subtopic',
    id,
    {
      isActive,
    },
  )
  return toSubtopicDTO(updated)
}

export async function archiveSubtopic(
  actor: ActingAdmin,
  id: string,
): Promise<AdminSubtopicDTO> {
  await guardSubtopicHasNoActiveChildren(id)

  const updated = await subtopicRepository.archive(id)
  if (!updated) throw ApiError.notFound('Subtopic not found')
  await invalidateLearnCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'subtopic.archive', 'Subtopic', id)
  return toSubtopicDTO(updated)
}

export async function restoreSubtopic(
  actor: ActingAdmin,
  id: string,
): Promise<AdminSubtopicDTO> {
  const updated = await subtopicRepository.restore(id)
  if (!updated) throw ApiError.notFound('Archived subtopic not found')
  await invalidateLearnCache()

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'subtopic.restore', 'Subtopic', id)
  return toSubtopicDTO(updated)
}
