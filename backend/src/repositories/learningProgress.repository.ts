import { Types } from 'mongoose'

import {
  LearningProgress,
  type LearningProgressDocument,
  type ProgressStatus,
} from '../models/LearningProgress.model'

function toObjectId(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new Types.ObjectId(id) : id
}

export function findByUserAndSubtopic(
  userId: Types.ObjectId | string,
  subtopicId: Types.ObjectId | string,
): Promise<LearningProgressDocument | null> {
  return LearningProgress.findOne({ userId, subtopicId })
}

export function findByUser(
  userId: Types.ObjectId | string,
  filter: { subjectId?: Types.ObjectId | string } = {},
): Promise<LearningProgressDocument[]> {
  // Never spread `{ subjectId: undefined }` into the query — the MongoDB
  // driver serializes an explicit `undefined` value as BSON `null` (not
  // "key absent"), which would silently match zero documents instead of
  // every subject. Only include the key when a real value was passed.
  return LearningProgress.find({
    userId,
    ...(filter.subjectId && { subjectId: filter.subjectId }),
  })
}

/** Used to compute subject/topic-level `progressPercent` on the fly from
 * real subtopic-level records, rather than persisting a duplicate rollup
 * percentage anywhere. */
export function findByUserAndSubtopics(
  userId: Types.ObjectId | string,
  subtopicIds: (Types.ObjectId | string)[],
): Promise<LearningProgressDocument[]> {
  return LearningProgress.find({ userId, subtopicId: { $in: subtopicIds } })
}

export function findMostRecentByUser(
  userId: Types.ObjectId | string,
  limit = 1,
): Promise<LearningProgressDocument[]> {
  return LearningProgress.find({ userId }).sort({ lastAccessedAt: -1 }).limit(limit)
}

/** Ensures a progress doc exists for (user, subtopic) and bumps
 * `lastAccessedAt` — the single primitive that backs both "record a visit"
 * (called with no other change) and every other mutation below (each of
 * which also touches recency as a side effect, never a separate write). */
export function touch(
  userId: Types.ObjectId | string,
  ids: { subjectId: Types.ObjectId | string; topicId: Types.ObjectId | string },
  subtopicId: Types.ObjectId | string,
): Promise<LearningProgressDocument> {
  return LearningProgress.findOneAndUpdate(
    { userId, subtopicId },
    {
      $set: { lastAccessedAt: new Date() },
      $setOnInsert: {
        userId,
        subjectId: ids.subjectId,
        topicId: ids.topicId,
        subtopicId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
}

/** The real signal behind "Fast Learner" (Sprint 4 Step 61) — did any single
 * calendar day (UTC) see at least `n` subtopics marked `completed`, computed
 * from real `completedAt` timestamps rather than a fabricated pace metric. */
export async function hasCompletedNInOneDay(
  userId: Types.ObjectId | string,
  n: number,
): Promise<boolean> {
  const rows = await LearningProgress.aggregate<{ _id: string; count: number }>([
    { $match: { userId: toObjectId(userId), status: 'completed', completedAt: { $ne: null } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gte: n } } },
    { $limit: 1 },
  ])
  return rows.length > 0
}

export function setStatus(
  userId: Types.ObjectId | string,
  ids: { subjectId: Types.ObjectId | string; topicId: Types.ObjectId | string },
  subtopicId: Types.ObjectId | string,
  status: ProgressStatus,
): Promise<LearningProgressDocument> {
  return LearningProgress.findOneAndUpdate(
    { userId, subtopicId },
    {
      $set: {
        status,
        completedAt: status === 'completed' ? new Date() : null,
        lastAccessedAt: new Date(),
      },
      $setOnInsert: {
        userId,
        subjectId: ids.subjectId,
        topicId: ids.topicId,
        subtopicId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
}

export function setNotesRead(
  userId: Types.ObjectId | string,
  ids: { subjectId: Types.ObjectId | string; topicId: Types.ObjectId | string },
  subtopicId: Types.ObjectId | string,
  notesRead: boolean,
): Promise<LearningProgressDocument> {
  return LearningProgress.findOneAndUpdate(
    { userId, subtopicId },
    {
      $set: { notesRead, lastAccessedAt: new Date() },
      $setOnInsert: {
        userId,
        subjectId: ids.subjectId,
        topicId: ids.topicId,
        subtopicId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
}

/** Upserts one lesson's embedded progress entry — updates it in place if
 * present, otherwise pushes a new entry (two-step: Mongo has no single
 * atomic "update array element or push" operator for a doc that might not
 * exist at all yet). */
export async function upsertLessonProgress(
  userId: Types.ObjectId | string,
  ids: { subjectId: Types.ObjectId | string; topicId: Types.ObjectId | string },
  subtopicId: Types.ObjectId | string,
  lessonId: Types.ObjectId | string,
  status: ProgressStatus,
  progressPercent: number,
): Promise<LearningProgressDocument> {
  const completedAt = status === 'completed' ? new Date() : undefined

  const updatedExisting = await LearningProgress.findOneAndUpdate(
    { userId, subtopicId, 'lessons.lessonId': lessonId },
    {
      $set: {
        'lessons.$.status': status,
        'lessons.$.progressPercent': progressPercent,
        ...(completedAt && { 'lessons.$.completedAt': completedAt }),
        lastAccessedAt: new Date(),
      },
    },
    { new: true },
  )
  if (updatedExisting) return updatedExisting

  return LearningProgress.findOneAndUpdate(
    { userId, subtopicId },
    {
      $push: { lessons: { lessonId, status, progressPercent, completedAt } },
      $set: { lastAccessedAt: new Date() },
      $setOnInsert: {
        userId,
        subjectId: ids.subjectId,
        topicId: ids.topicId,
        subtopicId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
}
