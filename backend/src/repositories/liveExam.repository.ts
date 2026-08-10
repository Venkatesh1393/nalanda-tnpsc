import type { Types } from 'mongoose'

import type { LiveExamStatus, LiveExamTab } from '../constants/liveExam'
import type { ILiveExam } from '../models/LiveExam.model'
import { LiveExam, type LiveExamDocument } from '../models/LiveExam.model'

export interface LiveExamListFilter {
  tab: LiveExamTab
  now: Date
  examId?: Types.ObjectId
}

/** Every query here excludes `draft` (never student-visible) — the
 * Upcoming/Live buckets additionally exclude `cancelled` (a cancelled exam
 * is never joinable and shouldn't tick a countdown toward nothing), while
 * Completed deliberately surfaces every cancelled exam regardless of its
 * original schedule, so it always lands somewhere honest rather than just
 * disappearing. Server time (`filter.now`) is the sole timing authority —
 * never a client-supplied value. */
export function findByTab(filter: LiveExamListFilter): Promise<LiveExamDocument[]> {
  const examScope = filter.examId ? { examId: filter.examId } : {}

  if (filter.tab === 'upcoming') {
    return LiveExam.find({
      ...examScope,
      status: { $nin: ['draft', 'cancelled'] },
      scheduledStartAt: { $gt: filter.now },
    }).sort({ scheduledStartAt: 1 })
  }

  if (filter.tab === 'live') {
    return LiveExam.find({
      ...examScope,
      status: { $nin: ['draft', 'cancelled'] },
      scheduledStartAt: { $lte: filter.now },
      scheduledEndAt: { $gte: filter.now },
    }).sort({ scheduledStartAt: 1 })
  }

  return LiveExam.find({
    ...examScope,
    status: { $ne: 'draft' },
    $or: [{ scheduledEndAt: { $lt: filter.now } }, { status: 'cancelled' }],
  }).sort({ scheduledEndAt: -1 })
}

export function findById(id: Types.ObjectId | string): Promise<LiveExamDocument | null> {
  return LiveExam.findOne({ _id: id, status: { $ne: 'draft' } })
}

// --- Admin CRUD (Sprint 4 Step 54) --- LiveExam has no soft-delete plugin
// (see `LiveExam.model.ts`'s header comment) — `status: 'cancelled'` is its
// retraction mechanism instead, same reasoning as Exam's plain
// activate/deactivate. Every function below is deliberately allowed to see
// `draft` exams — the one thing `findByTab`/`findById` above intentionally
// can never do, since a draft must never be student-visible.

export function create(data: Partial<ILiveExam>): Promise<LiveExamDocument> {
  return LiveExam.create(data)
}

export function findByIdForAdmin(
  id: Types.ObjectId | string,
): Promise<LiveExamDocument | null> {
  return LiveExam.findById(id)
}

export async function updateById(
  id: Types.ObjectId | string,
  data: Partial<ILiveExam>,
): Promise<LiveExamDocument | null> {
  const exam = await LiveExam.findById(id)
  if (!exam) return null
  Object.assign(exam, data)
  await exam.save()
  return exam
}

export function updateStatus(
  id: Types.ObjectId | string,
  status: LiveExamStatus,
): Promise<LiveExamDocument | null> {
  return LiveExam.findByIdAndUpdate(id, { $set: { status } }, { new: true })
}

/** Sets the admin manual-publish-results override — see
 * `LiveExam.model.ts`'s `IResultPublication.publishedAt` header comment. */
export function updateResultPublishedAt(
  id: Types.ObjectId | string,
  publishedAt: Date,
): Promise<LiveExamDocument | null> {
  return LiveExam.findByIdAndUpdate(
    id,
    { $set: { 'resultPublication.publishedAt': publishedAt } },
    { new: true },
  )
}

export interface AdminLiveExamListFilter {
  search?: string
  examId?: Types.ObjectId | string
  status?: LiveExamStatus
}

function buildAdminQuery(filter: AdminLiveExamListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (filter.examId) query.examId = filter.examId
  if (filter.status) query.status = filter.status
  if (filter.search) {
    const regex = { $regex: filter.search.trim(), $options: 'i' }
    query.$or = [{ 'title.en': regex }, { 'title.ta': regex }]
  }
  return query
}

export async function listForAdmin(
  filter: AdminLiveExamListFilter,
  page: number,
  limit: number,
): Promise<{ items: LiveExamDocument[]; total: number }> {
  const query = buildAdminQuery(filter)
  const [items, total] = await Promise.all([
    LiveExam.find(query)
      .sort({ scheduledStartAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    LiveExam.countDocuments(query),
  ])
  return { items, total }
}
