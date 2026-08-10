import type { Types } from 'mongoose'

import type {
  PracticeMode,
  PracticeSessionStatus,
  TimerType,
} from '../constants/practice'
import {
  PracticeSession,
  type IPracticeResult,
  type PracticeSessionDocument,
} from '../models/PracticeSession.model'

export interface CreateSessionInput {
  userId: Types.ObjectId | string
  mode: PracticeMode
  examId?: Types.ObjectId
  subjectId: Types.ObjectId
  topicId: Types.ObjectId
  questionIds: Types.ObjectId[]
  timerType: TimerType
  durationSeconds: number
}

export function create(input: CreateSessionInput): Promise<PracticeSessionDocument> {
  return PracticeSession.create(input)
}

export function findByIdForUser(
  sessionId: Types.ObjectId | string,
  userId: Types.ObjectId | string,
): Promise<PracticeSessionDocument | null> {
  return PracticeSession.findOne({ _id: sessionId, userId })
}

/** Upserts the answer for one question within the session's embedded
 * `answers` array — matches an existing entry by `questionId` if present
 * (a student changing their selection before finishing), otherwise appends
 * a new one. Both branches are scoped to `status: 'in-progress'` so an
 * already-submitted session can never be mutated this way. */
export async function upsertAnswer(
  sessionId: Types.ObjectId | string,
  userId: Types.ObjectId | string,
  questionId: Types.ObjectId | string,
  patch: { selectedOptionId: string | null; markedForReview?: boolean },
): Promise<PracticeSessionDocument | null> {
  const updatedExisting = await PracticeSession.findOneAndUpdate(
    { _id: sessionId, userId, status: 'in-progress', 'answers.questionId': questionId },
    {
      $set: {
        'answers.$.selectedOptionId': patch.selectedOptionId,
        ...(patch.markedForReview !== undefined && {
          'answers.$.markedForReview': patch.markedForReview,
        }),
      },
    },
    { new: true },
  )
  if (updatedExisting) return updatedExisting

  return PracticeSession.findOneAndUpdate(
    { _id: sessionId, userId, status: 'in-progress' },
    {
      $push: {
        answers: {
          questionId,
          selectedOptionId: patch.selectedOptionId,
          markedForReview: patch.markedForReview ?? false,
          hintUsed: false,
        },
      },
    },
    { new: true },
  )
}

export function submit(
  sessionId: Types.ObjectId | string,
  userId: Types.ObjectId | string,
  result: IPracticeResult,
): Promise<PracticeSessionDocument | null> {
  return PracticeSession.findOneAndUpdate(
    { _id: sessionId, userId, status: 'in-progress' },
    { $set: { status: 'submitted', submittedAt: new Date(), result } },
    { new: true },
  )
}

/** "Has the student ever completed a practice session at all" — the real
 * signal behind the "First Practice" achievement (Sprint 4 Step 61), a
 * stronger, more specific claim than "answered at least one question" —
 * counting a genuinely *finished* session, not just a started/abandoned one. */
export function countSubmittedByUser(userId: Types.ObjectId | string): Promise<number> {
  return PracticeSession.countDocuments({ userId, status: 'submitted' })
}

/** The real signal behind "Perfect Score" (Sprint 4 Step 61) — a genuinely
 * full session (`totalQuestions >= minQuestions`, so a trivial 1-question
 * session can't game it) scored 100% accuracy. */
export async function hasPerfectScore(
  userId: Types.ObjectId | string,
  minQuestions: number,
): Promise<boolean> {
  const match = await PracticeSession.exists({
    userId,
    status: 'submitted',
    'result.accuracyPercent': 100,
    'result.totalQuestions': { $gte: minQuestions },
  })
  return match !== null
}

export interface HistoryFilter {
  subjectId?: Types.ObjectId | string
  topicId?: Types.ObjectId | string
}

export async function findHistoryByUser(
  userId: Types.ObjectId | string,
  filter: HistoryFilter,
  page: number,
  limit: number,
  sort: 'newest' | 'oldest',
): Promise<{ sessions: PracticeSessionDocument[]; total: number }> {
  const query = {
    userId,
    status: 'submitted' as PracticeSessionStatus,
    ...(filter.subjectId && { subjectId: filter.subjectId }),
    ...(filter.topicId && { topicId: filter.topicId }),
  }
  const [sessions, total] = await Promise.all([
    PracticeSession.find(query)
      .sort({ submittedAt: sort === 'oldest' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    PracticeSession.countDocuments(query),
  ])
  return { sessions, total }
}
