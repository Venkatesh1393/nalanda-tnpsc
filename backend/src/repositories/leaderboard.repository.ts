import { Types } from 'mongoose'

import { PracticeSession } from '../models/PracticeSession.model'

export interface UserPeriodStats {
  userId: Types.ObjectId
  correctCount: number
  totalQuestions: number
  attempted: number
}

/**
 * One row per user who submitted at least one `PracticeSession` inside
 * `[from, to)` — real, aggregated straight from the same collection Practice
 * Results/Analytics already read, never a separate ledger. `attempted` sums
 * `result.totalQuestions` across the window (used for the eligibility
 * threshold in `services/leaderboard.service.ts`), distinct from
 * `totalQuestions` (used for the accuracy component of the score formula) —
 * they're numerically identical today (every submitted session counts every
 * one of its questions) but kept as separate fields so a future "only count
 * answered, not skipped" refinement doesn't require a shape change.
 */
export async function getPeriodStats(from?: Date, to?: Date): Promise<UserPeriodStats[]> {
  const match: Record<string, unknown> = { status: 'submitted' }
  if (from || to) {
    match.submittedAt = {
      ...(from && { $gte: from }),
      ...(to && { $lt: to }),
    }
  }

  return PracticeSession.aggregate<UserPeriodStats>([
    { $match: match },
    {
      $group: {
        _id: '$userId',
        correctCount: { $sum: '$result.correctCount' },
        totalQuestions: { $sum: '$result.totalQuestions' },
      },
    },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        correctCount: 1,
        totalQuestions: 1,
        attempted: '$totalQuestions',
      },
    },
  ])
}

export function toObjectId(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new Types.ObjectId(id) : id
}
