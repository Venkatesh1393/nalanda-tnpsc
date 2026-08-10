import type { Types } from 'mongoose'

import type { ITopic } from '../models/Topic.model'
import { notDeletedFilter } from '../models/shared/softDelete.plugin'
import { Topic, type TopicDocument } from '../models/Topic.model'

export function findBySubject(
  subjectId: Types.ObjectId | string,
): Promise<TopicDocument[]> {
  return Topic.find({ subjectId, isActive: true, ...notDeletedFilter }).sort({ order: 1 })
}

export function countBySubject(subjectId: Types.ObjectId | string): Promise<number> {
  return Topic.countDocuments({ subjectId, isActive: true, ...notDeletedFilter })
}

export function findBySlug(slug: string): Promise<TopicDocument | null> {
  return Topic.findOne({ slug, isActive: true, ...notDeletedFilter })
}

export function findById(id: Types.ObjectId | string): Promise<TopicDocument | null> {
  return Topic.findOne({ _id: id, isActive: true, ...notDeletedFilter })
}

export function search(
  regex: RegExp,
  examId?: Types.ObjectId | string,
): Promise<TopicDocument[]> {
  const filter: Record<string, unknown> = {
    isActive: true,
    ...notDeletedFilter,
    $or: [{ 'name.en': regex }, { 'name.ta': regex }],
  }
  if (examId) filter.examIds = examId
  return Topic.find(filter).sort({ order: 1 }).limit(20)
}

// --- Admin CRUD (Sprint 4 Step 54) ---------------------------------------

export function create(data: Partial<ITopic>): Promise<TopicDocument> {
  return Topic.create(data)
}

export function findByIdForAdmin(
  id: Types.ObjectId | string,
): Promise<TopicDocument | null> {
  return Topic.findOne({ _id: id, ...notDeletedFilter })
}

export function findByIdIncludingArchived(
  id: Types.ObjectId | string,
): Promise<TopicDocument | null> {
  return Topic.findById(id)
}

export async function updateById(
  id: Types.ObjectId | string,
  data: Partial<ITopic>,
): Promise<TopicDocument | null> {
  const topic = await Topic.findOne({ _id: id, ...notDeletedFilter })
  if (!topic) return null
  Object.assign(topic, data)
  await topic.save()
  return topic
}

export function updateActiveStatus(
  id: Types.ObjectId | string,
  isActive: boolean,
): Promise<TopicDocument | null> {
  return Topic.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { isActive } },
    { new: true },
  )
}

export function archive(id: Types.ObjectId | string): Promise<TopicDocument | null> {
  return Topic.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { deletedAt: new Date() } },
    { new: true },
  )
}

export function restore(id: Types.ObjectId | string): Promise<TopicDocument | null> {
  return Topic.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { new: true },
  )
}

export interface AdminTopicListFilter {
  search?: string
  subjectId?: Types.ObjectId | string
  status?: 'active' | 'inactive' | 'archived'
}

function buildAdminQuery(filter: AdminTopicListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (filter.status === 'archived') {
    query.deletedAt = { $ne: null }
  } else {
    query.deletedAt = null
    if (filter.status === 'active') query.isActive = true
    else if (filter.status === 'inactive') query.isActive = false
  }
  if (filter.subjectId) query.subjectId = filter.subjectId
  if (filter.search) {
    const regex = { $regex: filter.search.trim(), $options: 'i' }
    query.$or = [{ 'name.en': regex }, { 'name.ta': regex }, { slug: regex }]
  }
  return query
}

export async function listForAdmin(
  filter: AdminTopicListFilter,
  page: number,
  limit: number,
): Promise<{ items: TopicDocument[]; total: number }> {
  const query = buildAdminQuery(filter)
  const [items, total] = await Promise.all([
    Topic.find(query)
      .sort({ order: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Topic.countDocuments(query),
  ])
  return { items, total }
}
