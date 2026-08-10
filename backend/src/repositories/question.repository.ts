import type { Types } from 'mongoose'

import type { QuestionDifficulty } from '../constants/practice'
import type { IQuestion } from '../models/Question.model'
import { notDeletedFilter } from '../models/shared/softDelete.plugin'
import { Question, type QuestionDocument } from '../models/Question.model'

export interface QuestionSelectionFilter {
  topicId: Types.ObjectId | string
  difficulty?: QuestionDifficulty
}

/** Random sample via `$sample` rather than fetching the full eligible pool
 * and shuffling client-side — stays efficient once a topic holds 100+
 * questions (this module's stated target scale), not just today's small
 * dev seed. Returns ids only; the caller re-fetches full documents via
 * `findByIds` once the session's `questionIds` are persisted, which also
 * gives every other session read (resume, review) one single code path. */
export async function findRandomQuestionIds(
  filter: QuestionSelectionFilter,
  limit: number,
): Promise<Types.ObjectId[]> {
  const match: Record<string, unknown> = {
    topicId: filter.topicId,
    isActive: true,
    deletedAt: null,
    ...(filter.difficulty && { difficulty: filter.difficulty }),
  }
  const docs = await Question.aggregate<{ _id: Types.ObjectId }>([
    { $match: match },
    { $sample: { size: limit } },
    { $project: { _id: 1 } },
  ])
  return docs.map((doc) => doc._id)
}

export function findByIds(ids: (Types.ObjectId | string)[]): Promise<QuestionDocument[]> {
  return Question.find({ _id: { $in: ids }, ...notDeletedFilter })
}

export function findById(id: Types.ObjectId | string): Promise<QuestionDocument | null> {
  return Question.findOne({ _id: id, ...notDeletedFilter })
}

/** Sets the question's illustrative image to a freshly-uploaded Cloudinary
 * asset — always both fields together, since a `questionImageUrl` without
 * its `questionImagePublicId` could never be deleted/replaced again. */
export function updateImage(
  id: Types.ObjectId | string,
  image: { questionImageUrl: string; questionImagePublicId: string },
): Promise<QuestionDocument | null> {
  return Question.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: image },
    { new: true },
  )
}

export function clearImage(
  id: Types.ObjectId | string,
): Promise<QuestionDocument | null> {
  return Question.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $unset: { questionImageUrl: '', questionImagePublicId: '' } },
    { new: true },
  )
}

// --- Admin CRUD + Bulk Import (Sprint 4 Step 53) -----------------------

export function create(data: Partial<IQuestion>): Promise<QuestionDocument> {
  return Question.create(data)
}

/** Admin-only read — unlike `findById`, this deliberately has no `isActive`
 * filter (an inactive/deactivated question must still be viewable/editable
 * in the Admin Panel), but still respects soft-delete: an archived question
 * is reachable only via `findByIdIncludingArchived`. */
export function findByIdForAdmin(
  id: Types.ObjectId | string,
): Promise<QuestionDocument | null> {
  return Question.findOne({ _id: id, ...notDeletedFilter })
}

export function findByIdIncludingArchived(
  id: Types.ObjectId | string,
): Promise<QuestionDocument | null> {
  return Question.findById(id)
}

/** Applies a partial update via `.save()` (not `findOneAndUpdate`) so every
 * Mongoose validator — including `options`'s custom "exactly one correct"
 * checker, which reads sibling fields off `this` — runs against the real,
 * fully-merged document rather than an update-query context where that
 * context isn't reliably available. */
export async function updateById(
  id: Types.ObjectId | string,
  data: Partial<IQuestion>,
): Promise<QuestionDocument | null> {
  const question = await Question.findOne({ _id: id, ...notDeletedFilter })
  if (!question) return null
  Object.assign(question, data)
  await question.save()
  return question
}

export function updateActiveStatus(
  id: Types.ObjectId | string,
  isActive: boolean,
): Promise<QuestionDocument | null> {
  return Question.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { isActive } },
    { new: true },
  )
}

export function archive(id: Types.ObjectId | string): Promise<QuestionDocument | null> {
  return Question.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { deletedAt: new Date() } },
    { new: true },
  )
}

export function restore(id: Types.ObjectId | string): Promise<QuestionDocument | null> {
  return Question.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { new: true },
  )
}

export interface AdminQuestionListFilter {
  search?: string
  examId?: Types.ObjectId | string
  subjectId?: Types.ObjectId | string
  topicId?: Types.ObjectId | string
  subtopicId?: Types.ObjectId | string
  difficulty?: QuestionDifficulty
  language?: 'en' | 'ta'
  isPreviousYear?: boolean
  status?: 'active' | 'inactive' | 'archived'
}

function buildAdminQuestionQuery(
  filter: AdminQuestionListFilter,
): Record<string, unknown> {
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
    query.$or = [{ 'questionText.en': regex }, { 'questionText.ta': regex }]
  }
  if (filter.examId) query.examIds = filter.examId
  if (filter.subjectId) query.subjectId = filter.subjectId
  if (filter.topicId) query.topicId = filter.topicId
  if (filter.subtopicId) query.subtopicId = filter.subtopicId
  if (filter.difficulty) query.difficulty = filter.difficulty
  if (filter.language === 'ta') {
    query['questionText.ta'] = { $exists: true, $ne: '' }
  }
  if (filter.isPreviousYear !== undefined) query.isPreviousYear = filter.isPreviousYear

  return query
}

export async function listForAdmin(
  filter: AdminQuestionListFilter,
  page: number,
  limit: number,
): Promise<{ items: QuestionDocument[]; total: number }> {
  const query = buildAdminQuestionQuery(filter)
  const [items, total] = await Promise.all([
    Question.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Question.countDocuments(query),
  ])
  return { items, total }
}

/** Bulk Import's DB-side duplicate check — fetches every non-deleted
 * question's English text for a given subtopic once, so the import parser
 * can compare a whole file's rows against it in memory instead of issuing
 * one query per row. Small, bounded result set per subtopic by design (this
 * module's data model keeps subtopics narrow). */
export async function findQuestionTextsBySubtopic(
  subtopicId: Types.ObjectId | string,
): Promise<{ id: string; textEn: string }[]> {
  const docs = await Question.find(
    { subtopicId, ...notDeletedFilter },
    { 'questionText.en': 1 },
  )
  return docs.map((doc) => ({ id: doc.id, textEn: doc.questionText.en ?? '' }))
}

/**
 * Inserts a batch of already-validated question documents. `ordered: false`
 * so one row's unexpected Mongoose-level failure doesn't abort the rest —
 * matches Step 53's explicit "partial import" requirement. Every row given
 * to this function has already passed `questionImport.service.ts`'s
 * validation, so a failure here is a genuine defense-in-depth catch, not the
 * expected path.
 */
export async function bulkInsert(docs: Partial<IQuestion>[]): Promise<{
  insertedCount: number
  insertedIds: string[]
  failures: { index: number; message: string }[]
}> {
  if (docs.length === 0) return { insertedCount: 0, insertedIds: [], failures: [] }

  try {
    const inserted = await Question.insertMany(docs, { ordered: false })
    return {
      insertedCount: inserted.length,
      insertedIds: inserted.map((doc) => doc.id as string),
      failures: [],
    }
  } catch (error) {
    const bulkError = error as {
      insertedDocs?: QuestionDocument[]
      writeErrors?: { index: number; err?: { errmsg?: string }; errmsg?: string }[]
    }
    const insertedIds = (bulkError.insertedDocs ?? []).map((doc) => doc.id as string)
    const failures = (bulkError.writeErrors ?? []).map((writeError) => ({
      index: writeError.index,
      message: writeError.err?.errmsg ?? writeError.errmsg ?? 'Insert failed',
    }))
    return { insertedCount: insertedIds.length, insertedIds, failures }
  }
}
