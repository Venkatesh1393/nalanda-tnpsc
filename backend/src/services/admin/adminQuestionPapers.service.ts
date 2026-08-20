import type { Role } from '../../constants/roles'
import { QUESTION_PAPER_FILE_FOLDER } from '../../constants/questionPapers'
import type { IQuestionPaper, QuestionPaperDocument } from '../../models/QuestionPaper.model'
import type { BilingualText } from '../../models/shared/bilingualText'
import * as questionPaperRepository from '../../repositories/questionPaper.repository'
import type { AdminQuestionPaperListFilter } from '../../repositories/questionPaper.repository'
import * as userRepository from '../../repositories/user.repository'
import { ApiError } from '../../utils/ApiError'
import type {
  CreateQuestionPaperBody,
  UpdateQuestionPaperBody,
} from '../../validators/admin/questionPapers.validator'
import * as auditLogService from '../auditLog.service'
import * as cloudinaryUploadService from '../media/cloudinaryUpload.service'

export type ActingAdmin = { id: string; role: Role }

async function resolveAuditActor(actor: ActingAdmin) {
  const actingUser = await userRepository.findById(actor.id)
  return { id: actor.id, role: actor.role, email: actingUser?.email ?? 'unknown' }
}

export interface AdminQuestionPaperDTO {
  id: string
  examId: string
  year: number
  title: BilingualText
  tnpscExamType?: string
  fileUrl?: string
  fileBytes?: number
  isActive: boolean
  status: 'active' | 'inactive' | 'archived'
  createdAt: Date | null
  updatedAt: Date | null
}

function toDTO(paper: QuestionPaperDocument): AdminQuestionPaperDTO {
  const status: AdminQuestionPaperDTO['status'] = paper.deletedAt
    ? 'archived'
    : paper.isActive
      ? 'active'
      : 'inactive'

  return {
    id: paper.id,
    examId: paper.examId.toString(),
    year: paper.year,
    title: paper.title,
    tnpscExamType: paper.tnpscExamType,
    fileUrl: paper.fileUrl,
    fileBytes: paper.fileBytes,
    isActive: paper.isActive,
    status,
    createdAt: paper.createdAt ?? null,
    updatedAt: paper.updatedAt ?? null,
  }
}

export async function listQuestionPapers(
  filter: AdminQuestionPaperListFilter,
  page: number,
  limit: number,
): Promise<{ items: AdminQuestionPaperDTO[]; total: number; page: number; limit: number }> {
  const { items, total } = await questionPaperRepository.listForAdmin(filter, page, limit)
  return { items: items.map(toDTO), total, page, limit }
}

export async function getQuestionPaperById(id: string): Promise<AdminQuestionPaperDTO> {
  const paper = await questionPaperRepository.findByIdForAdmin(id)
  if (!paper) throw ApiError.notFound('Question paper not found')
  return toDTO(paper)
}

export async function createQuestionPaper(
  actor: ActingAdmin,
  data: CreateQuestionPaperBody,
): Promise<AdminQuestionPaperDTO> {
  const paper = await questionPaperRepository.create(data as unknown as Partial<IQuestionPaper>)

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'questionPaper.create',
    'QuestionPaper',
    paper.id,
    { examId: data.examId, year: data.year },
  )

  return toDTO(paper)
}

export async function updateQuestionPaper(
  actor: ActingAdmin,
  id: string,
  data: UpdateQuestionPaperBody,
): Promise<AdminQuestionPaperDTO> {
  const updated = await questionPaperRepository.updateById(
    id,
    data as unknown as Partial<IQuestionPaper>,
  )
  if (!updated) throw ApiError.notFound('Question paper not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'questionPaper.update', 'QuestionPaper', id, {
    fields: Object.keys(data),
  })

  return toDTO(updated)
}

export async function updateQuestionPaperStatus(
  actor: ActingAdmin,
  id: string,
  isActive: boolean,
): Promise<AdminQuestionPaperDTO> {
  const updated = await questionPaperRepository.updateById(id, { isActive })
  if (!updated) throw ApiError.notFound('Question paper not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    isActive ? 'questionPaper.activate' : 'questionPaper.deactivate',
    'QuestionPaper',
    id,
    { isActive },
  )

  return toDTO(updated)
}

/** Same "upload a fresh Cloudinary asset, then delete the old one" flow as
 * `learn.service.ts#uploadStudyMaterialFile` — question papers are always
 * PDF (`middleware/upload.middleware.ts#uploadQuestionPaperFile` enforces
 * this at the multer layer), so `resourceType` is always `'raw'`, unlike
 * StudyMaterial's image-or-PDF branch. */
export async function uploadQuestionPaperFile(
  actor: ActingAdmin,
  id: string,
  file: Express.Multer.File,
): Promise<AdminQuestionPaperDTO> {
  const paper = await questionPaperRepository.findByIdForAdmin(id)
  if (!paper) throw ApiError.notFound('Question paper not found')
  const previousPublicId = paper.filePublicId

  const uploaded = await cloudinaryUploadService.uploadBuffer(file.buffer, {
    folder: QUESTION_PAPER_FILE_FOLDER,
    resourceType: 'raw',
  })

  const updated = await questionPaperRepository.updateFile(id, {
    fileUrl: uploaded.secureUrl,
    filePublicId: uploaded.publicId,
    fileBytes: uploaded.bytes,
  })
  if (!updated) throw ApiError.notFound('Question paper not found')

  if (previousPublicId) {
    await cloudinaryUploadService.deleteAsset(previousPublicId, 'raw')
  }

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'questionPaper.uploadFile', 'QuestionPaper', id)

  return toDTO(updated)
}

export async function archiveQuestionPaper(
  actor: ActingAdmin,
  id: string,
): Promise<AdminQuestionPaperDTO> {
  const updated = await questionPaperRepository.archive(id)
  if (!updated) throw ApiError.notFound('Question paper not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'questionPaper.archive', 'QuestionPaper', id)

  return toDTO(updated)
}

export async function restoreQuestionPaper(
  actor: ActingAdmin,
  id: string,
): Promise<AdminQuestionPaperDTO> {
  const updated = await questionPaperRepository.restore(id)
  if (!updated) throw ApiError.notFound('Archived question paper not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'questionPaper.restore', 'QuestionPaper', id)

  return toDTO(updated)
}
