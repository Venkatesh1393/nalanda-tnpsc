import type { Types } from 'mongoose'

import type { TnpscExamStage } from '../constants/practice'
import type { IQuestionPaper } from '../models/QuestionPaper.model'
import { QuestionPaper, type QuestionPaperDocument } from '../models/QuestionPaper.model'
import { notDeletedFilter } from '../models/shared/softDelete.plugin'

// --- Student-facing reads --------------------------------------------------

export interface PublicListFilter {
  examId?: Types.ObjectId | string
  year?: number
  tnpscExamType?: TnpscExamStage
}

function buildPublicQuery(filter: PublicListFilter): Record<string, unknown> {
  return {
    isActive: true,
    ...notDeletedFilter,
    ...(filter.examId && { examId: filter.examId }),
    ...(filter.year && { year: filter.year }),
    ...(filter.tnpscExamType && { tnpscExamType: filter.tnpscExamType }),
  }
}

export async function listPublic(
  filter: PublicListFilter,
  page: number,
  limit: number,
): Promise<{ items: QuestionPaperDocument[]; total: number }> {
  const query = buildPublicQuery(filter)
  const [items, total] = await Promise.all([
    QuestionPaper.find(query)
      .sort({ year: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    QuestionPaper.countDocuments(query),
  ])
  return { items, total }
}

export function findById(
  id: Types.ObjectId | string,
): Promise<QuestionPaperDocument | null> {
  return QuestionPaper.findOne({ _id: id, ...buildPublicQuery({}) })
}

// --- Admin CRUD -------------------------------------------------------------

export function create(data: Partial<IQuestionPaper>): Promise<QuestionPaperDocument> {
  return QuestionPaper.create(data)
}

/** Admin-only read — no `isActive` gate, so a not-yet-published paper is
 * still viewable/editable. */
export function findByIdForAdmin(
  id: Types.ObjectId | string,
): Promise<QuestionPaperDocument | null> {
  return QuestionPaper.findOne({ _id: id, ...notDeletedFilter })
}

/** Applies a partial update via `.save()` — same reasoning as
 * `currentAffair.repository.ts`'s `updateById`: cross-field/custom
 * validators need the real, fully-merged document. */
export async function updateById(
  id: Types.ObjectId | string,
  data: Partial<IQuestionPaper>,
): Promise<QuestionPaperDocument | null> {
  const paper = await QuestionPaper.findOne({ _id: id, ...notDeletedFilter })
  if (!paper) return null
  Object.assign(paper, data)
  await paper.save()
  return paper
}

/** Sets the paper's file to a freshly-uploaded Cloudinary asset — always all
 * three fields together, since a `fileUrl` without its `filePublicId` could
 * never be deleted/replaced again. */
export function updateFile(
  id: Types.ObjectId | string,
  file: { fileUrl: string; filePublicId: string; fileBytes: number },
): Promise<QuestionPaperDocument | null> {
  return QuestionPaper.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: file },
    { new: true },
  )
}

export function archive(
  id: Types.ObjectId | string,
): Promise<QuestionPaperDocument | null> {
  return QuestionPaper.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { deletedAt: new Date() } },
    { new: true },
  )
}

export function restore(
  id: Types.ObjectId | string,
): Promise<QuestionPaperDocument | null> {
  return QuestionPaper.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { new: true },
  )
}

export interface AdminQuestionPaperListFilter {
  search?: string
  examId?: Types.ObjectId | string
  year?: number
  status?: 'active' | 'inactive' | 'archived'
}

function buildAdminQuery(filter: AdminQuestionPaperListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}

  if (filter.status === 'archived') {
    query.deletedAt = { $ne: null }
  } else {
    query.deletedAt = null
    if (filter.status === 'active') query.isActive = true
    else if (filter.status === 'inactive') query.isActive = false
  }

  if (filter.search) {
    const regex = { $regex: filter.search.trim(), $options: 'i' }
    query.$or = [{ 'title.en': regex }, { 'title.ta': regex }]
  }
  if (filter.examId) query.examId = filter.examId
  if (filter.year) query.year = filter.year

  return query
}

export async function listForAdmin(
  filter: AdminQuestionPaperListFilter,
  page: number,
  limit: number,
): Promise<{ items: QuestionPaperDocument[]; total: number }> {
  const query = buildAdminQuery(filter)
  const [items, total] = await Promise.all([
    QuestionPaper.find(query)
      .sort({ year: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    QuestionPaper.countDocuments(query),
  ])
  return { items, total }
}
