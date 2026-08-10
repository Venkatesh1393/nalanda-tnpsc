import type { Role } from '../../constants/roles'
import type { ILesson, LessonDocument } from '../../models/Lesson.model'
import type {
  IStudyMaterial,
  StudyMaterialDocument,
} from '../../models/StudyMaterial.model'
import * as lessonRepository from '../../repositories/lesson.repository'
import type { AdminLessonListFilter } from '../../repositories/lesson.repository'
import * as studyMaterialRepository from '../../repositories/studyMaterial.repository'
import type { AdminStudyMaterialListFilter } from '../../repositories/studyMaterial.repository'
import * as subtopicRepository from '../../repositories/subtopic.repository'
import * as userRepository from '../../repositories/user.repository'
import { ApiError } from '../../utils/ApiError'
import type {
  CreateLessonBody,
  CreateStudyMaterialBody,
  UpdateLessonBody,
  UpdateStudyMaterialBody,
} from '../../validators/contentHierarchy.validator'
import * as auditLogService from '../auditLog.service'

export type ActingAdmin = { id: string; role: Role }

async function resolveAuditActor(actor: ActingAdmin) {
  const actingUser = await userRepository.findById(actor.id)
  return { id: actor.id, role: actor.role, email: actingUser?.email ?? 'unknown' }
}

type ContentStatus = 'active' | 'inactive' | 'archived'

function statusOf(deletedAt: Date | null, isActive: boolean): ContentStatus {
  return deletedAt ? 'archived' : isActive ? 'active' : 'inactive'
}

async function requireParentSubtopic(subtopicId: string): Promise<void> {
  const subtopic = await subtopicRepository.findByIdIncludingArchived(subtopicId)
  if (!subtopic || subtopic.deletedAt) {
    throw ApiError.badRequest(
      'subtopicId does not reference a real, non-archived subtopic',
    )
  }
}

// =========================================================================
// Lesson — a leaf under Subtopic; no children of its own, so no
// orphan-prevention guard is needed on its own archive/deactivate.
// =========================================================================

export interface AdminLessonDTO {
  id: string
  subtopicId: string
  title: { en?: string; ta?: string }
  type: string
  order: number
  video?: { cloudinaryAssetId?: string; durationSeconds?: number; thumbnailUrl?: string }
  transcript?: { en?: string; ta?: string }
  isPremium: boolean
  isActive: boolean
  status: ContentStatus
  createdAt: Date | null
  updatedAt: Date | null
}

function toLessonDTO(lesson: LessonDocument): AdminLessonDTO {
  return {
    id: lesson.id,
    subtopicId: lesson.subtopicId.toString(),
    title: lesson.title,
    type: lesson.type,
    order: lesson.order,
    video: lesson.video,
    transcript: lesson.transcript,
    isPremium: lesson.isPremium,
    isActive: lesson.isActive,
    status: statusOf(lesson.deletedAt, lesson.isActive),
    createdAt: lesson.createdAt ?? null,
    updatedAt: lesson.updatedAt ?? null,
  }
}

export async function listLessons(
  filter: AdminLessonListFilter,
  page: number,
  limit: number,
): Promise<{ items: AdminLessonDTO[]; total: number; page: number; limit: number }> {
  const { items, total } = await lessonRepository.listForAdmin(filter, page, limit)
  return { items: items.map(toLessonDTO), total, page, limit }
}

export async function getLessonById(id: string): Promise<AdminLessonDTO> {
  const lesson = await lessonRepository.findByIdIncludingArchived(id)
  if (!lesson) throw ApiError.notFound('Lesson not found')
  return toLessonDTO(lesson)
}

export async function createLesson(
  actor: ActingAdmin,
  data: CreateLessonBody,
): Promise<AdminLessonDTO> {
  await requireParentSubtopic(data.subtopicId)

  const lesson = await lessonRepository.create(data as unknown as Partial<ILesson>)
  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'lesson.create', 'Lesson', lesson.id, {
    subtopicId: data.subtopicId,
  })
  return toLessonDTO(lesson)
}

export async function updateLesson(
  actor: ActingAdmin,
  id: string,
  data: UpdateLessonBody,
): Promise<AdminLessonDTO> {
  if (data.subtopicId) await requireParentSubtopic(data.subtopicId)

  const updated = await lessonRepository.updateById(
    id,
    data as unknown as Partial<ILesson>,
  )
  if (!updated) throw ApiError.notFound('Lesson not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'lesson.update', 'Lesson', id, {
    fields: Object.keys(data),
  })
  return toLessonDTO(updated)
}

export async function updateLessonStatus(
  actor: ActingAdmin,
  id: string,
  isActive: boolean,
): Promise<AdminLessonDTO> {
  const updated = await lessonRepository.updateActiveStatus(id, isActive)
  if (!updated) throw ApiError.notFound('Lesson not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'lesson.status.update', 'Lesson', id, {
    isActive,
  })
  return toLessonDTO(updated)
}

export async function archiveLesson(
  actor: ActingAdmin,
  id: string,
): Promise<AdminLessonDTO> {
  const updated = await lessonRepository.archive(id)
  if (!updated) throw ApiError.notFound('Lesson not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'lesson.archive', 'Lesson', id)
  return toLessonDTO(updated)
}

export async function restoreLesson(
  actor: ActingAdmin,
  id: string,
): Promise<AdminLessonDTO> {
  const updated = await lessonRepository.restore(id)
  if (!updated) throw ApiError.notFound('Archived lesson not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'lesson.restore', 'Lesson', id)
  return toLessonDTO(updated)
}

// =========================================================================
// StudyMaterial — plain metadata CRUD is new in Step 54; file
// upload/replace/remove stays on the existing Step 50 routes
// (`/study-materials/:id/file`), reused unchanged (see routes file).
// =========================================================================

export interface AdminStudyMaterialDTO {
  id: string
  subtopicId: string
  title: { en?: string; ta?: string }
  body: { en: string[]; ta: string[] }
  type: string
  isPremium: boolean
  version: number
  fileUrl?: string
  fileResourceType?: string
  fileFormat?: string
  fileBytes?: number
  isActive: boolean
  status: ContentStatus
  createdAt: Date | null
  updatedAt: Date | null
}

function toStudyMaterialDTO(material: StudyMaterialDocument): AdminStudyMaterialDTO {
  return {
    id: material.id,
    subtopicId: material.subtopicId.toString(),
    title: material.title,
    body: material.body,
    type: material.type,
    isPremium: material.isPremium,
    version: material.version,
    fileUrl: material.fileUrl,
    fileResourceType: material.fileResourceType,
    fileFormat: material.fileFormat,
    fileBytes: material.fileBytes,
    isActive: material.isActive,
    status: statusOf(material.deletedAt, material.isActive),
    createdAt: material.createdAt ?? null,
    updatedAt: material.updatedAt ?? null,
  }
}

export async function listStudyMaterials(
  filter: AdminStudyMaterialListFilter,
  page: number,
  limit: number,
): Promise<{
  items: AdminStudyMaterialDTO[]
  total: number
  page: number
  limit: number
}> {
  const { items, total } = await studyMaterialRepository.listForAdmin(filter, page, limit)
  return { items: items.map(toStudyMaterialDTO), total, page, limit }
}

export async function getStudyMaterialById(id: string): Promise<AdminStudyMaterialDTO> {
  const material = await studyMaterialRepository.findByIdIncludingArchived(id)
  if (!material) throw ApiError.notFound('Study material not found')
  return toStudyMaterialDTO(material)
}

export async function createStudyMaterial(
  actor: ActingAdmin,
  data: CreateStudyMaterialBody,
): Promise<AdminStudyMaterialDTO> {
  await requireParentSubtopic(data.subtopicId)

  const material = await studyMaterialRepository.create(
    data as unknown as Partial<IStudyMaterial>,
  )
  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'studyMaterial.create',
    'StudyMaterial',
    material.id,
    { subtopicId: data.subtopicId },
  )
  return toStudyMaterialDTO(material)
}

export async function updateStudyMaterial(
  actor: ActingAdmin,
  id: string,
  data: UpdateStudyMaterialBody,
): Promise<AdminStudyMaterialDTO> {
  if (data.subtopicId) await requireParentSubtopic(data.subtopicId)

  const updated = await studyMaterialRepository.updateById(
    id,
    data as unknown as Partial<IStudyMaterial>,
  )
  if (!updated) throw ApiError.notFound('Study material not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'studyMaterial.update',
    'StudyMaterial',
    id,
    {
      fields: Object.keys(data),
    },
  )
  return toStudyMaterialDTO(updated)
}

export async function updateStudyMaterialStatus(
  actor: ActingAdmin,
  id: string,
  isActive: boolean,
): Promise<AdminStudyMaterialDTO> {
  const updated = await studyMaterialRepository.updateActiveStatus(id, isActive)
  if (!updated) throw ApiError.notFound('Study material not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'studyMaterial.status.update',
    'StudyMaterial',
    id,
    { isActive },
  )
  return toStudyMaterialDTO(updated)
}

export async function archiveStudyMaterial(
  actor: ActingAdmin,
  id: string,
): Promise<AdminStudyMaterialDTO> {
  const updated = await studyMaterialRepository.archive(id)
  if (!updated) throw ApiError.notFound('Study material not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'studyMaterial.archive',
    'StudyMaterial',
    id,
  )
  return toStudyMaterialDTO(updated)
}

export async function restoreStudyMaterial(
  actor: ActingAdmin,
  id: string,
): Promise<AdminStudyMaterialDTO> {
  const updated = await studyMaterialRepository.restore(id)
  if (!updated) throw ApiError.notFound('Archived study material not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'studyMaterial.restore',
    'StudyMaterial',
    id,
  )
  return toStudyMaterialDTO(updated)
}
