import type { Types } from 'mongoose'

import type { PracticeMode } from '../constants/practice'
import {
  QuestionAttempt,
  type IQuestionAttempt,
  type QuestionAttemptDocument,
} from '../models/QuestionAttempt.model'

export interface CreateAttemptInput {
  userId: Types.ObjectId | string
  questionId: Types.ObjectId | string
  sessionId?: Types.ObjectId | string
  mode: PracticeMode
  selectedOptionId: string | null
  isCorrect: boolean
  timeTakenSeconds: number
  markedForReview?: boolean
}

export function create(input: CreateAttemptInput): Promise<QuestionAttemptDocument> {
  return QuestionAttempt.create(input)
}

/** Sprint 4 Step 67 — plain (`.lean()`) rows: both callers
 * (`services/practice.service.ts`) only ever read `questionId`/
 * `selectedOptionId`/`isCorrect`/`timeTakenSeconds` off these, never
 * `.save()` them, so skipping Mongoose document hydration on every
 * session-submit/summary read is free. */
export type QuestionAttemptRow = Pick<
  IQuestionAttempt,
  'questionId' | 'selectedOptionId' | 'isCorrect' | 'timeTakenSeconds'
>

export function findBySession(
  sessionId: Types.ObjectId | string,
): Promise<QuestionAttemptRow[]> {
  return QuestionAttempt.find({ sessionId }).sort({ attemptedAt: 1 }).lean()
}

/** The real "gone quiet" signal behind the Practice Reminder trigger
 * (Sprint 4 Step 62) — every user who has practiced *before* (so this is a
 * genuine "come back," not a first-time nudge — the Adaptive Practice
 * Engine already owns "start practicing" encouragement for brand-new users)
 * but whose most recent attempt is older than `cutoff`. */
export async function findInactiveUserIds(cutoff: Date): Promise<Types.ObjectId[]> {
  const rows = await QuestionAttempt.aggregate<{ _id: Types.ObjectId }>([
    { $group: { _id: '$userId', lastAttemptAt: { $max: '$attemptedAt' } } },
    { $match: { lastAttemptAt: { $lt: cutoff } } },
  ])
  return rows.map((row) => row._id)
}
