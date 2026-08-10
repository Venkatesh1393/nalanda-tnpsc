import type { Types } from 'mongoose'

import type { ISubtopic } from '../models/Subtopic.model'
import { notDeletedFilter } from '../models/shared/softDelete.plugin'
import { Subtopic, type SubtopicDocument } from '../models/Subtopic.model'

export function findByTopic(
  topicId: Types.ObjectId | string,
): Promise<SubtopicDocument[]> {
  return Subtopic.find({ topicId, isActive: true, ...notDeletedFilter }).sort({
    order: 1,
  })
}

export function countByTopic(topicId: Types.ObjectId | string): Promise<number> {
  return Subtopic.countDocuments({ topicId, isActive: true, ...notDeletedFilter })
}

export function findBySubject(
  subjectId: Types.ObjectId | string,
): Promise<SubtopicDocument[]> {
  return Subtopic.find({ subjectId, isActive: true, ...notDeletedFilter })
}

export function findBySlug(slug: string): Promise<SubtopicDocument | null> {
  return Subtopic.findOne({ slug, isActive: true, ...notDeletedFilter })
}

export function findById(id: Types.ObjectId | string): Promise<SubtopicDocument | null> {
  return Subtopic.findOne({ _id: id, isActive: true, ...notDeletedFilter })
}

export function search(
  regex: RegExp,
  examId?: Types.ObjectId | string,
): Promise<SubtopicDocument[]> {
  const filter: Record<string, unknown> = {
    isActive: true,
    ...notDeletedFilter,
    $or: [{ 'name.en': regex }, { 'name.ta': regex }],
  }
  if (examId) filter.examIds = examId
  return Subtopic.find(filter).sort({ order: 1 }).limit(20)
}

// --- Admin CRUD (Sprint 4 Step 54) ---------------------------------------

export function create(data: Partial<ISubtopic>): Promise<SubtopicDocument> {
  return Subtopic.create(data)
}

export function findByIdForAdmin(
  id: Types.ObjectId | string,
): Promise<SubtopicDocument | null> {
  return Subtopic.findOne({ _id: id, ...notDeletedFilter })
}

export function findByIdIncludingArchived(
  id: Types.ObjectId | string,
): Promise<SubtopicDocument | null> {
  return Subtopic.findById(id)
}

export async function updateById(
  id: Types.ObjectId | string,
  data: Partial<ISubtopic>,
): Promise<SubtopicDocument | null> {
  const subtopic = await Subtopic.findOne({ _id: id, ...notDeletedFilter })
  if (!subtopic) return null
  Object.assign(subtopic, data)
  await subtopic.save()
  return subtopic
}

export function updateActiveStatus(
  id: Types.ObjectId | string,
  isActive: boolean,
): Promise<SubtopicDocument | null> {
  return Subtopic.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { isActive } },
    { new: true },
  )
}

export function archive(id: Types.ObjectId | string): Promise<SubtopicDocument | null> {
  return Subtopic.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { deletedAt: new Date() } },
    { new: true },
  )
}

export function restore(id: Types.ObjectId | string): Promise<SubtopicDocument | null> {
  return Subtopic.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { new: true },
  )
}

export interface AdminSubtopicListFilter {
  search?: string
  topicId?: Types.ObjectId | string
  status?: 'active' | 'inactive' | 'archived'
}

function buildAdminQuery(filter: AdminSubtopicListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (filter.status === 'archived') {
    query.deletedAt = { $ne: null }
  } else {
    query.deletedAt = null
    if (filter.status === 'active') query.isActive = true
    else if (filter.status === 'inactive') query.isActive = false
  }
  if (filter.topicId) query.topicId = filter.topicId
  if (filter.search) {
    const regex = { $regex: filter.search.trim(), $options: 'i' }
    query.$or = [{ 'name.en': regex }, { 'name.ta': regex }, { slug: regex }]
  }
  return query
}

export async function listForAdmin(
  filter: AdminSubtopicListFilter,
  page: number,
  limit: number,
): Promise<{ items: SubtopicDocument[]; total: number }> {
  const query = buildAdminQuery(filter)
  const [items, total] = await Promise.all([
    Subtopic.find(query)
      .sort({ order: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Subtopic.countDocuments(query),
  ])
  return { items, total }
}
