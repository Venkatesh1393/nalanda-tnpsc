import { Types } from 'mongoose'

import type { PracticeMode } from '../constants/practice'
import type { IPracticeResult } from '../models/PracticeSession.model'
import { PracticeSession } from '../models/PracticeSession.model'
import { QuestionAttempt } from '../models/QuestionAttempt.model'

/**
 * Analytics reads two collections at very different volumes (docs/Database.md
 * §4.3/§8): `QuestionAttempt` (one doc per answer, the platform's
 * highest-volume collection — every query against it here is an aggregation
 * pipeline, never a bulk `.find()`) and `PracticeSession` (one doc per
 * session, naturally session-granularity and orders of magnitude smaller —
 * a lean bulk fetch of a user's own submitted sessions is not the
 * "load every attempt into Node" anti-pattern this step's instructions warn
 * against, since it never touches the high-volume collection).
 */

function toObjectId(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new Types.ObjectId(id) : id
}

// ---- QuestionAttempt aggregations (per-user) ----

export interface AttemptTotals {
  attempted: number
  correct: number
  totalResponseTimeSeconds: number
}

export async function getUserAttemptTotals(
  userId: Types.ObjectId | string,
): Promise<AttemptTotals> {
  const [row] = await QuestionAttempt.aggregate<AttemptTotals>([
    { $match: { userId: toObjectId(userId) } },
    {
      $group: {
        _id: null,
        attempted: { $sum: 1 },
        correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        totalResponseTimeSeconds: { $sum: '$timeTakenSeconds' },
      },
    },
  ])
  return row ?? { attempted: 0, correct: 0, totalResponseTimeSeconds: 0 }
}

export interface SubjectAttemptRow {
  subjectId: Types.ObjectId
  attempted: number
  correct: number
  totalResponseTimeSeconds: number
  lastPracticedAt: Date
  /** Chronological (oldest → newest) correctness sequence — small, bounded
   * to this one user's attempts on this one subject, used only to derive a
   * recent-half-vs-earlier-half trend direction, never returned to the
   * client as-is. */
  correctSequence: boolean[]
}

export async function getAttemptsBySubject(
  userId: Types.ObjectId | string,
): Promise<SubjectAttemptRow[]> {
  return QuestionAttempt.aggregate<SubjectAttemptRow>([
    { $match: { userId: toObjectId(userId) } },
    { $sort: { attemptedAt: 1 } },
    {
      $lookup: {
        from: 'questions',
        localField: 'questionId',
        foreignField: '_id',
        as: 'question',
      },
    },
    { $unwind: '$question' },
    {
      $group: {
        _id: '$question.subjectId',
        attempted: { $sum: 1 },
        correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        totalResponseTimeSeconds: { $sum: '$timeTakenSeconds' },
        lastPracticedAt: { $max: '$attemptedAt' },
        correctSequence: { $push: '$isCorrect' },
      },
    },
    {
      $project: {
        _id: 0,
        subjectId: '$_id',
        attempted: 1,
        correct: 1,
        totalResponseTimeSeconds: 1,
        lastPracticedAt: 1,
        correctSequence: 1,
      },
    },
  ])
}

export interface TopicAttemptRow {
  topicId: Types.ObjectId
  subjectId: Types.ObjectId
  attempted: number
  correct: number
  totalResponseTimeSeconds: number
  lastPracticedAt: Date
  correctSequence: boolean[]
}

export async function getAttemptsByTopic(
  userId: Types.ObjectId | string,
  subjectId?: Types.ObjectId | string,
): Promise<TopicAttemptRow[]> {
  return QuestionAttempt.aggregate<TopicAttemptRow>([
    { $match: { userId: toObjectId(userId) } },
    { $sort: { attemptedAt: 1 } },
    {
      $lookup: {
        from: 'questions',
        localField: 'questionId',
        foreignField: '_id',
        as: 'question',
      },
    },
    { $unwind: '$question' },
    ...(subjectId ? [{ $match: { 'question.subjectId': toObjectId(subjectId) } }] : []),
    {
      $group: {
        _id: '$question.topicId',
        subjectId: { $first: '$question.subjectId' },
        attempted: { $sum: 1 },
        correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        totalResponseTimeSeconds: { $sum: '$timeTakenSeconds' },
        lastPracticedAt: { $max: '$attemptedAt' },
        correctSequence: { $push: '$isCorrect' },
      },
    },
    {
      $project: {
        _id: 0,
        topicId: '$_id',
        subjectId: 1,
        attempted: 1,
        correct: 1,
        totalResponseTimeSeconds: 1,
        lastPracticedAt: 1,
        correctSequence: 1,
      },
    },
  ])
}

export interface DifficultyAttemptRow {
  difficulty: string
  attempted: number
  correct: number
  totalResponseTimeSeconds: number
}

export async function getAttemptsByDifficulty(
  userId: Types.ObjectId | string,
): Promise<DifficultyAttemptRow[]> {
  return QuestionAttempt.aggregate<DifficultyAttemptRow>([
    { $match: { userId: toObjectId(userId) } },
    {
      $lookup: {
        from: 'questions',
        localField: 'questionId',
        foreignField: '_id',
        as: 'question',
      },
    },
    { $unwind: '$question' },
    {
      $group: {
        _id: '$question.difficulty',
        attempted: { $sum: 1 },
        correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        totalResponseTimeSeconds: { $sum: '$timeTakenSeconds' },
      },
    },
    {
      $project: {
        _id: 0,
        difficulty: '$_id',
        attempted: 1,
        correct: 1,
        totalResponseTimeSeconds: 1,
      },
    },
  ])
}

export interface TopicDifficultyAttemptRow {
  topicId: Types.ObjectId
  difficulty: string
  attempted: number
  correct: number
}

/** Per-topic, per-difficulty breakdown — the real "difficulty performance"
 * signal the Adaptive Practice Engine (Sprint 4 Step 60) needs to suggest a
 * next difficulty, distinct from `getAttemptsByDifficulty` above (which is
 * global across every topic). */
export async function getAttemptsByTopicAndDifficulty(
  userId: Types.ObjectId | string,
): Promise<TopicDifficultyAttemptRow[]> {
  return QuestionAttempt.aggregate<TopicDifficultyAttemptRow>([
    { $match: { userId: toObjectId(userId) } },
    {
      $lookup: {
        from: 'questions',
        localField: 'questionId',
        foreignField: '_id',
        as: 'question',
      },
    },
    { $unwind: '$question' },
    {
      $group: {
        _id: { topicId: '$question.topicId', difficulty: '$question.difficulty' },
        attempted: { $sum: 1 },
        correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        topicId: '$_id.topicId',
        difficulty: '$_id.difficulty',
        attempted: 1,
        correct: 1,
      },
    },
  ])
}

/** One distinct calendar day string (`YYYY-MM-DD`, UTC) per day the user
 * answered at least one question — the raw material a streak is walked out
 * of in the service layer. Bounded by the number of distinct days a user
 * has ever been active, not by attempt volume. */
export async function getDistinctActiveDates(
  userId: Types.ObjectId | string,
): Promise<string[]> {
  const rows = await QuestionAttempt.aggregate<{ _id: string }>([
    { $match: { userId: toObjectId(userId) } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$attemptedAt' } } } },
    { $sort: { _id: 1 } },
  ])
  return rows.map((row) => row._id)
}

// ---- Cross-user (cohort) aggregations — real, computed from every user's
// QuestionAttempts, never fabricated. Acceptable to aggregate live at this
// stage's data volume; a StudentAnalytics materialized view (already
// modeled, dormant since Step 42) is the natural home for this once a
// background-job scheduler exists (docs/Database.md §8.1) — out of this
// step's scope. ----

export interface CohortAccuracyRow {
  userId: Types.ObjectId
  attempted: number
  accuracyPercent: number
}

export async function getCohortAccuracy(): Promise<CohortAccuracyRow[]> {
  return QuestionAttempt.aggregate<CohortAccuracyRow>([
    {
      $group: {
        _id: '$userId',
        attempted: { $sum: 1 },
        correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        attempted: 1,
        accuracyPercent: {
          $cond: [
            { $eq: ['$attempted', 0] },
            0,
            { $multiply: [{ $divide: ['$correct', '$attempted'] }, 100] },
          ],
        },
      },
    },
  ])
}

export interface CohortSubjectResponseTimeRow {
  subjectId: Types.ObjectId
  avgResponseTimeSeconds: number
}

export async function getCohortAverageResponseTimeBySubject(): Promise<
  CohortSubjectResponseTimeRow[]
> {
  return QuestionAttempt.aggregate<CohortSubjectResponseTimeRow>([
    {
      $lookup: {
        from: 'questions',
        localField: 'questionId',
        foreignField: '_id',
        as: 'question',
      },
    },
    { $unwind: '$question' },
    {
      $group: {
        _id: '$question.subjectId',
        totalResponseTimeSeconds: { $sum: '$timeTakenSeconds' },
        attempted: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        subjectId: '$_id',
        avgResponseTimeSeconds: {
          $cond: [
            { $eq: ['$attempted', 0] },
            0,
            { $divide: ['$totalResponseTimeSeconds', '$attempted'] },
          ],
        },
      },
    },
  ])
}

// ---- PracticeSession — low-volume, session-granularity, a lean bulk read
// is the right tool (see file header). ----

export interface SubmittedSessionRow {
  id: string
  subjectId?: Types.ObjectId
  topicId?: Types.ObjectId
  mode: PracticeMode
  startedAt: Date
  submittedAt: Date
  result: IPracticeResult
}

export async function getSubmittedSessions(
  userId: Types.ObjectId | string,
): Promise<SubmittedSessionRow[]> {
  const sessions = await PracticeSession.find({ userId, status: 'submitted' })
    .select('subjectId topicId mode startedAt submittedAt result')
    .sort({ submittedAt: -1 })
    .lean()

  return sessions
    .filter((session) => Boolean(session.result) && Boolean(session.submittedAt))
    .map((session) => ({
      id: session._id.toString(),
      subjectId: session.subjectId,
      topicId: session.topicId,
      mode: session.mode,
      startedAt: session.startedAt,
      submittedAt: session.submittedAt as Date,
      result: session.result as IPracticeResult,
    }))
}
