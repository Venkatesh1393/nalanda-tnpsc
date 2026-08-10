import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { PRACTICE_MODES, type PracticeMode } from '../constants/practice'

/**
 * The platform's highest-volume collection (docs/Database.md §4.3) —
 * append-only, one document per answer, never updated in place. All
 * analytics/weak-area/percentile computation derives from here via
 * scheduled aggregation into `StudentAnalytics`, never a live query.
 */
export interface IQuestionAttempt {
  userId: Types.ObjectId
  questionId: Types.ObjectId
  sessionId?: Types.ObjectId // null for ad-hoc practice outside a PracticeSession
  mode: PracticeMode
  selectedOptionId: string | null // null = skipped/unanswered
  isCorrect: boolean
  timeTakenSeconds: number
  markedForReview: boolean
  attemptedAt: Date
}

export type QuestionAttemptDocument = HydratedDocument<IQuestionAttempt>

const questionAttemptSchema = new Schema<IQuestionAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'PracticeSession' },
    mode: { type: String, enum: PRACTICE_MODES, required: true },
    selectedOptionId: { type: String, default: null },
    isCorrect: { type: Boolean, required: true, default: false },
    timeTakenSeconds: { type: Number, required: true, min: 0 },
    markedForReview: { type: Boolean, default: false },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

questionAttemptSchema.index({ userId: 1, attemptedAt: -1 })
questionAttemptSchema.index({ sessionId: 1 })
questionAttemptSchema.index({ questionId: 1 })

export const QuestionAttempt = model<IQuestionAttempt>(
  'QuestionAttempt',
  questionAttemptSchema,
)
