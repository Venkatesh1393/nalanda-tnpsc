import type { Types } from 'mongoose'

import type { ISubject } from '../models/Subject.model'
import { notDeletedFilter } from '../models/shared/softDelete.plugin'
import { Subject, type SubjectDocument } from '../models/Subject.model'

/** Every function here is scoped to active, non-deleted content — the
 * student-facing Learn module never surfaces inactive/soft-deleted rows;
 * an admin/content-management surface (not in this step's scope) would
 * need its own, separately-filtered queries. */

export function findByExam(examId: Types.ObjectId | string): Promise<SubjectDocument[]> {
  return Subject.find({ examIds: examId, isActive: true, ...notDeletedFilter }).sort({
    order: 1,
  })
}

export function findAll(): Promise<SubjectDocument[]> {
  return Subject.find({ isActive: true, ...notDeletedFilter }).sort({ order: 1 })
}

export function findBySlug(slug: string): Promise<SubjectDocument | null> {
  return Subject.findOne({ slug, isActive: true, ...notDeletedFilter })
}

export function findById(id: Types.ObjectId | string): Promise<SubjectDocument | null> {
  return Subject.findOne({ _id: id, isActive: true, ...notDeletedFilter })
}

export function search(
  regex: RegExp,
  examId?: Types.ObjectId | string,
): Promise<SubjectDocument[]> {
  const filter: Record<string, unknown> = {
    isActive: true,
    ...notDeletedFilter,
    $or: [{ 'name.en': regex }, { 'name.ta': regex }],
  }
  if (examId) filter.examIds = examId
  return Subject.find(filter).sort({ order: 1 }).limit(20)
}

// --- Admin CRUD (Sprint 4 Step 54) ---------------------------------------

export function create(data: Partial<ISubject>): Promise<SubjectDocument> {
  return Subject.create(data)
}

/** Admin-only read — no `isActive` filter (a deactivated Subject must still
 * be viewable/editable), but still respects soft-delete. */
export function findByIdForAdmin(
  id: Types.ObjectId | string,
): Promise<SubjectDocument | null> {
  return Subject.findOne({ _id: id, ...notDeletedFilter })
}

export function findByIdIncludingArchived(
  id: Types.ObjectId | string,
): Promise<SubjectDocument | null> {
  return Subject.findById(id)
}

export async function updateById(
  id: Types.ObjectId | string,
  data: Partial<ISubject>,
): Promise<SubjectDocument | null> {
  const subject = await Subject.findOne({ _id: id, ...notDeletedFilter })
  if (!subject) return null
  Object.assign(subject, data)
  await subject.save()
  return subject
}

export function updateActiveStatus(
  id: Types.ObjectId | string,
  isActive: boolean,
): Promise<SubjectDocument | null> {
  return Subject.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { isActive } },
    { new: true },
  )
}

export function archive(id: Types.ObjectId | string): Promise<SubjectDocument | null> {
  return Subject.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { deletedAt: new Date() } },
    { new: true },
  )
}

export function restore(id: Types.ObjectId | string): Promise<SubjectDocument | null> {
  return Subject.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { new: true },
  )
}

export interface AdminSubjectListFilter {
  search?: string
  examId?: Types.ObjectId | string
  status?: 'active' | 'inactive' | 'archived'
}

function buildAdminQuery(filter: AdminSubjectListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (filter.status === 'archived') {
    query.deletedAt = { $ne: null }
  } else {
    query.deletedAt = null
    if (filter.status === 'active') query.isActive = true
    else if (filter.status === 'inactive') query.isActive = false
  }
  if (filter.examId) query.examIds = filter.examId
  if (filter.search) {
    const regex = { $regex: filter.search.trim(), $options: 'i' }
    query.$or = [{ 'name.en': regex }, { 'name.ta': regex }, { slug: regex }]
  }
  return query
}

export async function listForAdmin(
  filter: AdminSubjectListFilter,
  page: number,
  limit: number,
): Promise<{ items: SubjectDocument[]; total: number }> {
  const query = buildAdminQuery(filter)
  const [items, total] = await Promise.all([
    Subject.find(query)
      .sort({ order: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Subject.countDocuments(query),
  ])
  return { items, total }
}
