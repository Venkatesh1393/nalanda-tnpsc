import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import {
  LIVE_EXAM_ATTEMPT_STATUSES,
  LIVE_EXAM_SUBMISSION_TYPES,
  type LiveExamAttemptStatus,
  type LiveExamSubmissionType,
} from '../constants/liveExam'

export interface ILiveExamAnswer {
  questionId: Types.ObjectId
  selectedOptionId: string | null
  markedForReview: boolean
}

const liveExamAnswerSchema = new Schema<ILiveExamAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOptionId: { type: String, default: null },
    markedForReview: { type: Boolean, default: false },
  },
  { _id: false },
)

/**
 * A student's single attempt at one `LiveExam` — deliberately its own
 * collection, never `PracticeSession`/`QuestionAttempt` (Step 48's explicit
 * "store separately from ordinary Smart Practice" instruction). Unlike
 * Practice, no per-answer correctness is ever computed or stored until
 * `submit` — this document has no derived "revealed" state at all while
 * `status === 'in-progress'`, since Live Exam questions never reveal
 * correctness mid-exam (`docs/Smart_Practice.md` §2/§11's hard-timer,
 * non-adaptive, faithful-exam-simulation boundary).
 */
export interface ILiveExamAttempt {
  userId: Types.ObjectId
  liveExamId: Types.ObjectId
  answers: ILiveExamAnswer[]
  status: LiveExamAttemptStatus
  submissionType?: LiveExamSubmissionType
  startedAt: Date
  submittedAt?: Date
  score: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
}

export type LiveExamAttemptDocument = HydratedDocument<ILiveExamAttempt>

const liveExamAttemptSchema = new Schema<ILiveExamAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    liveExamId: { type: Schema.Types.ObjectId, ref: 'LiveExam', required: true },
    answers: { type: [liveExamAnswerSchema], default: [] },
    status: { type: String, enum: LIVE_EXAM_ATTEMPT_STATUSES, default: 'in-progress' },
    submissionType: { type: String, enum: LIVE_EXAM_SUBMISSION_TYPES },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    score: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// One attempt per student per live exam — a real, DB-level guarantee
// against duplicate active attempts (Step 48's explicit security rule),
// not just a service-layer check.
liveExamAttemptSchema.index({ userId: 1, liveExamId: 1 }, { unique: true })
liveExamAttemptSchema.index({ liveExamId: 1 })
liveExamAttemptSchema.index({ userId: 1, startedAt: -1 })

export const LiveExamAttempt = model<ILiveExamAttempt>(
  'LiveExamAttempt',
  liveExamAttemptSchema,
)
