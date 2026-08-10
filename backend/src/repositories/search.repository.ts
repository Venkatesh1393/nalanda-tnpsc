import type { Types } from 'mongoose'

import { CurrentAffair, type CurrentAffairDocument } from '../models/CurrentAffair.model'
import { Lesson, type LessonDocument } from '../models/Lesson.model'
import { LiveExam, type LiveExamDocument } from '../models/LiveExam.model'
import { Question, type QuestionDocument } from '../models/Question.model'
import { SearchHistory } from '../models/SearchHistory.model'
import { notDeletedFilter } from '../models/shared/softDelete.plugin'
import { Subject, type SubjectDocument } from '../models/Subject.model'
import { Topic, type TopicDocument } from '../models/Topic.model'
import { buildActiveFilter } from './currentAffair.repository'

/** A document hydrated with `$meta: 'textScore'`'s extra projected field —
 * Mongoose's schema typing doesn't know about it, so every `$text` search
 * function below returns this intersection instead of the plain document
 * type. */
export type Scored<T> = T & { score?: number }

// ---- Global Search — `$text`-indexed, relevance-ranked (Sprint 4 Step 63).
// Distinct from each model's existing plain-regex `search()` (still used by
// Learn's/Current Affairs' own in-module search bars) — see
// `models/*.model.ts`'s text-index comments for why both coexist. ----

export function searchSubjects(
  query: string,
  examId: Types.ObjectId | string | undefined,
  limit: number,
): Promise<Scored<SubjectDocument>[]> {
  const filter: Record<string, unknown> = {
    isActive: true,
    ...notDeletedFilter,
    $text: { $search: query },
    ...(examId && { examIds: examId }),
  }
  return Subject.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
}

export function searchTopics(
  query: string,
  examId: Types.ObjectId | string | undefined,
  limit: number,
): Promise<Scored<TopicDocument>[]> {
  const filter: Record<string, unknown> = {
    isActive: true,
    ...notDeletedFilter,
    $text: { $search: query },
    ...(examId && { examIds: examId }),
  }
  return Topic.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
}

export function searchLessons(
  query: string,
  limit: number,
): Promise<Scored<LessonDocument>[]> {
  const filter: Record<string, unknown> = {
    isActive: true,
    ...notDeletedFilter,
    $text: { $search: query },
  }
  return Lesson.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
}

export function searchQuestions(
  query: string,
  examId: Types.ObjectId | string | undefined,
  limit: number,
): Promise<Scored<QuestionDocument>[]> {
  const filter: Record<string, unknown> = {
    isActive: true,
    ...notDeletedFilter,
    $text: { $search: query },
    ...(examId && { examIds: examId }),
  }
  return Question.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
}

export function searchCurrentAffairs(
  query: string,
  limit: number,
): Promise<Scored<CurrentAffairDocument>[]> {
  const filter: Record<string, unknown> = {
    ...buildActiveFilter(new Date()),
    $text: { $search: query },
  }
  return CurrentAffair.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
}

export function searchLiveExams(
  query: string,
  examId: Types.ObjectId | string | undefined,
  limit: number,
): Promise<Scored<LiveExamDocument>[]> {
  const filter: Record<string, unknown> = {
    status: { $ne: 'draft' },
    $text: { $search: query },
    ...(examId && { examId }),
  }
  return LiveExam.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
}

// ---- Autocomplete — word-prefix regex, not `$text` (MongoDB's text index
// matches whole tokens, so it can't serve "geo" -> "Geography" as the user
// is still mid-word). A case-insensitive prefix regex can't use a plain
// btree index either way, so this stays a bounded (`.limit()`) scan — the
// same accepted trade-off every existing regex `search()` in this codebase
// already makes; a real fix would mean MongoDB Atlas Search autocomplete
// indexes, infra this project doesn't have. ----

export function autocompleteSubjects(
  regex: RegExp,
  examId: Types.ObjectId | string | undefined,
  limit: number,
): Promise<SubjectDocument[]> {
  const filter: Record<string, unknown> = {
    isActive: true,
    ...notDeletedFilter,
    $or: [{ 'name.en': regex }, { 'name.ta': regex }],
    ...(examId && { examIds: examId }),
  }
  return Subject.find(filter).sort({ order: 1 }).limit(limit)
}

export function autocompleteTopics(
  regex: RegExp,
  examId: Types.ObjectId | string | undefined,
  limit: number,
): Promise<TopicDocument[]> {
  const filter: Record<string, unknown> = {
    isActive: true,
    ...notDeletedFilter,
    $or: [{ 'name.en': regex }, { 'name.ta': regex }],
    ...(examId && { examIds: examId }),
  }
  return Topic.find(filter).sort({ order: 1 }).limit(limit)
}

export function autocompleteLessons(
  regex: RegExp,
  limit: number,
): Promise<LessonDocument[]> {
  return Lesson.find({
    isActive: true,
    ...notDeletedFilter,
    $or: [{ 'title.en': regex }, { 'title.ta': regex }],
  })
    .sort({ order: 1 })
    .limit(limit)
}

export function autocompleteQuestions(
  regex: RegExp,
  examId: Types.ObjectId | string | undefined,
  limit: number,
): Promise<QuestionDocument[]> {
  const filter: Record<string, unknown> = {
    isActive: true,
    ...notDeletedFilter,
    $or: [{ 'questionText.en': regex }, { 'questionText.ta': regex }],
    ...(examId && { examIds: examId }),
  }
  return Question.find(filter).limit(limit)
}

export function autocompleteCurrentAffairs(
  regex: RegExp,
  limit: number,
): Promise<CurrentAffairDocument[]> {
  return CurrentAffair.find({
    ...buildActiveFilter(new Date()),
    $or: [{ 'title.en': regex }, { 'title.ta': regex }],
  })
    .sort({ date: -1 })
    .limit(limit)
}

export function autocompleteLiveExams(
  regex: RegExp,
  examId: Types.ObjectId | string | undefined,
  limit: number,
): Promise<LiveExamDocument[]> {
  const filter: Record<string, unknown> = {
    status: { $ne: 'draft' },
    $or: [{ 'title.en': regex }, { 'title.ta': regex }],
    ...(examId && { examId }),
  }
  return LiveExam.find(filter).sort({ scheduledStartAt: -1 }).limit(limit)
}

// ---- Search history — "Recent Searches" (per-user) and "Popular Searches"
// (cross-user aggregation over the same collection). ----

export async function touchHistory(
  userId: Types.ObjectId | string,
  query: string,
): Promise<void> {
  await SearchHistory.findOneAndUpdate(
    { userId, query },
    { $inc: { count: 1 }, $set: { lastSearchedAt: new Date() } },
    { upsert: true },
  )
}

export function findRecentHistory(
  userId: Types.ObjectId | string,
  limit: number,
): Promise<{ query: string; lastSearchedAt: Date }[]> {
  return SearchHistory.find({ userId })
    .sort({ lastSearchedAt: -1 })
    .limit(limit)
    .select({ query: 1, lastSearchedAt: 1 })
}

export function findPopularQueries(
  limit: number,
): Promise<{ query: string; count: number }[]> {
  return SearchHistory.aggregate<{ query: string; count: number }>([
    { $group: { _id: '$query', count: { $sum: '$count' } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, query: '$_id', count: 1 } },
  ])
}

export async function removeHistoryEntry(
  userId: Types.ObjectId | string,
  query: string,
): Promise<boolean> {
  const result = await SearchHistory.deleteOne({ userId, query })
  return result.deletedCount > 0
}

export async function clearHistory(userId: Types.ObjectId | string): Promise<number> {
  const result = await SearchHistory.deleteMany({ userId })
  return result.deletedCount
}
