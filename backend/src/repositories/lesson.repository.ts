import type { Types } from 'mongoose'

import type { ILesson, LessonType } from '../models/Lesson.model'
import { Lesson, type LessonDocument } from '../models/Lesson.model'
import { notDeletedFilter } from '../models/shared/softDelete.plugin'

export function findBySubtopic(
  subtopicId: Types.ObjectId | string,
): Promise<LessonDocument[]> {
  return Lesson.find({ subtopicId, isActive: true, ...notDeletedFilter }).sort({
    order: 1,
  })
}

/** The subtopic's primary lesson of a given type — current content is 1:1
 * subtopic→video lesson, but this doesn't assume that stays true forever
 * (returns the lowest-`order` match rather than erroring on more than one). */
export function findPrimaryForSubtopic(
  subtopicId: Types.ObjectId | string,
  type: LessonType,
): Promise<LessonDocument | null> {
  return Lesson.findOne({ subtopicId, type, isActive: true, ...notDeletedFilter }).sort({
    order: 1,
  })
}

export function findById(id: Types.ObjectId | string): Promise<LessonDocument | null> {
  return Lesson.findOne({ _id: id, isActive: true, ...notDeletedFilter })
}

/** Active, non-deleted count for a subtopic — Step 54's orphan-prevention
 * check before a Subtopic can be deactivated/archived. */
export function countBySubtopic(subtopicId: Types.ObjectId | string): Promise<number> {
  return Lesson.countDocuments({ subtopicId, isActive: true, ...notDeletedFilter })
}

// --- Admin CRUD (Sprint 4 Step 54) ---------------------------------------

export function create(data: Partial<ILesson>): Promise<LessonDocument> {
  return Lesson.create(data)
}

export function findByIdForAdmin(
  id: Types.ObjectId | string,
): Promise<LessonDocument | null> {
  return Lesson.findOne({ _id: id, ...notDeletedFilter })
}

export function findByIdIncludingArchived(
  id: Types.ObjectId | string,
): Promise<LessonDocument | null> {
  return Lesson.findById(id)
}

export async function updateById(
  id: Types.ObjectId | string,
  data: Partial<ILesson>,
): Promise<LessonDocument | null> {
  const lesson = await Lesson.findOne({ _id: id, ...notDeletedFilter })
  if (!lesson) return null
  Object.assign(lesson, data)
  await lesson.save()
  return lesson
}

export function updateActiveStatus(
  id: Types.ObjectId | string,
  isActive: boolean,
): Promise<LessonDocument | null> {
  return Lesson.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { isActive } },
    { new: true },
  )
}

export function archive(id: Types.ObjectId | string): Promise<LessonDocument | null> {
  return Lesson.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { deletedAt: new Date() } },
    { new: true },
  )
}

export function restore(id: Types.ObjectId | string): Promise<LessonDocument | null> {
  return Lesson.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { new: true },
  )
}

export interface AdminLessonListFilter {
  search?: string
  subtopicId?: Types.ObjectId | string
  status?: 'active' | 'inactive' | 'archived'
}

function buildAdminQuery(filter: AdminLessonListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (filter.status === 'archived') {
    query.deletedAt = { $ne: null }
  } else {
    query.deletedAt = null
    if (filter.status === 'active') query.isActive = true
    else if (filter.status === 'inactive') query.isActive = false
  }
  if (filter.subtopicId) query.subtopicId = filter.subtopicId
  if (filter.search) {
    const regex = { $regex: filter.search.trim(), $options: 'i' }
    query.$or = [{ 'title.en': regex }, { 'title.ta': regex }]
  }
  return query
}

export async function listForAdmin(
  filter: AdminLessonListFilter,
  page: number,
  limit: number,
): Promise<{ items: LessonDocument[]; total: number }> {
  const query = buildAdminQuery(filter)
  const [items, total] = await Promise.all([
    Lesson.find(query)
      .sort({ order: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Lesson.countDocuments(query),
  ])
  return { items, total }
}
