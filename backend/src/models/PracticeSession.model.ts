import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import {
  PRACTICE_MODES,
  PRACTICE_SESSION_STATUSES,
  TIMER_TYPES,
  type PracticeMode,
  type PracticeSessionStatus,
  type TimerType,
} from '../constants/practice'

export interface IPracticeAnswer {
  questionId: Types.ObjectId
  selectedOptionId: string | null
  markedForReview: boolean
  hintUsed: boolean
}

const practiceAnswerSchema = new Schema<IPracticeAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOptionId: { type: String, default: null },
    markedForReview: { type: Boolean, default: false },
    hintUsed: { type: Boolean, default: false },
  },
  { _id: false },
)

export interface IPracticeResult {
  totalQuestions: number
  correctCount: number
  incorrectCount: number
  skippedCount: number
  accuracyPercent: number
  timeTakenSeconds: number
  xpAwarded: number
  coinsAwarded: number
}

/**
 * The *live, mutable* session container — `answers` and `result` are small
 * and bounded (by `questionIds.length`, the session's own question count),
 * always read/written together with the session, hence embedded (same
 * embedding rule as `Question.options`). The immutable, high-volume,
 * analytics-facing record of each answer is `QuestionAttempt`, written
 * separately once a session is submitted — this collection is not a
 * replacement for that one.
 */
export interface IPracticeSession {
  userId: Types.ObjectId
  mode: PracticeMode
  examId?: Types.ObjectId
  subjectId?: Types.ObjectId
  topicId?: Types.ObjectId
  subtopicId?: Types.ObjectId
  pyqYear?: number
  questionIds: Types.ObjectId[]
  answers: IPracticeAnswer[]
  timerType: TimerType
  durationSeconds: number
  status: PracticeSessionStatus
  startedAt: Date
  submittedAt?: Date
  result?: IPracticeResult
}

export type PracticeSessionDocument = HydratedDocument<IPracticeSession>

const practiceSessionSchema = new Schema<IPracticeSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mode: { type: String, enum: PRACTICE_MODES, required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam' },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic' },
    subtopicId: { type: Schema.Types.ObjectId, ref: 'Subtopic' },
    pyqYear: { type: Number },
    questionIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length > 0,
        message: 'A PracticeSession must contain at least one question.',
      },
    },
    answers: { type: [practiceAnswerSchema], default: [] },
    timerType: { type: String, enum: TIMER_TYPES, required: true },
    durationSeconds: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PRACTICE_SESSION_STATUSES, default: 'in-progress' },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    result: {
      totalQuestions: Number,
      correctCount: Number,
      incorrectCount: Number,
      skippedCount: Number,
      accuracyPercent: Number,
      timeTakenSeconds: Number,
      xpAwarded: Number,
      coinsAwarded: Number,
    },
  },
  { timestamps: true },
)

practiceSessionSchema.index({ userId: 1, status: 1 })
practiceSessionSchema.index({ userId: 1, startedAt: -1 })
practiceSessionSchema.index({ mode: 1 })

export const PracticeSession = model<IPracticeSession>(
  'PracticeSession',
  practiceSessionSchema,
)
