import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import {
  LIVE_EXAM_STATUSES,
  RESULT_PUBLICATION_MODES,
  type LiveExamStatus,
  type ResultPublicationMode,
} from '../constants/liveExam'
import {
  bilingualField,
  bilingualParagraphsField,
  type BilingualParagraphs,
  type BilingualText,
} from './shared/bilingualText'

export interface INegativeMarking {
  enabled: boolean
  /** Marks deducted for one wrong answer — a positive number, subtracted
   * at scoring time. `0`/`enabled: false` both mean "no negative marking";
   * both are kept (rather than inferring from `0`) so a content editor can
   * see the toggle's own state instead of reading it out of a magnitude. */
  marksPerWrongAnswer: number
}

const negativeMarkingSchema = new Schema<INegativeMarking>(
  {
    enabled: { type: Boolean, default: false },
    marksPerWrongAnswer: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
)

export interface IResultPublication {
  mode: ResultPublicationMode
  /** Required when `mode === 'scheduled'` — validated below. */
  publishAt?: Date
  /** Sprint 4 Step 54 — an admin-triggered manual override, set only by
   * `POST /admin/live-exams/:id/publish-results`. When present, results are
   * published from this timestamp forward regardless of `mode`/`publishAt`
   * (`liveExam.service.ts`'s `isResultPublished` checks this first) — lets
   * an admin release results early (past `scheduledEndAt`, so mid-exam
   * students can never see them) or ahead of a `scheduled` `publishAt` that
   * turned out to be later than intended. Distinct field from `publishAt`
   * on purpose: `publishAt` is the *configured* schedule (input), this is
   * the *actual* publish moment (output/override) — never conflate them. */
  publishedAt?: Date
}

const resultPublicationSchema = new Schema<IResultPublication>(
  {
    mode: { type: String, enum: RESULT_PUBLICATION_MODES, default: 'immediate' },
    publishAt: {
      type: Date,
      validate: {
        validator(this: IResultPublication, value: Date | undefined) {
          return this.mode !== 'scheduled' || value !== undefined
        },
        message: 'publishAt is required when resultPublication.mode is "scheduled".',
      },
    },
    publishedAt: { type: Date },
  },
  { _id: false },
)

/**
 * Self-contained by design (Step 48's explicit field list) — unlike
 * `docs/Database.md` §4.3's illustrative `Live Exams` (which references a
 * separate `Mock Tests` question-set definition), this exam owns its own
 * title/description/questionIds/marking/instructions directly, since no
 * `MockTest` model exists in this codebase and this step didn't ask for
 * one. `registeredCount`/a registrant list are deliberately absent — no
 * separate "register ahead of time" step exists here (join === start,
 * Step 48's flow); cohort participation is derivable from
 * `LiveExamAttempt` counts if ever needed, the same anti-pattern-avoidance
 * `docs/Database.md` §8's "never embed a registrant array" already
 * establishes for the illustrative shape.
 */
export interface ILiveExam {
  title: BilingualText
  description: BilingualText
  examId: Types.ObjectId
  subjectIds: Types.ObjectId[]
  questionIds: Types.ObjectId[]
  scheduledStartAt: Date
  scheduledEndAt: Date
  /** Minutes a student gets once they personally start — capped against
   * `scheduledEndAt` at join time by the service layer, never trusted alone
   * (a student joining late must not get the full duration past the
   * cohort's hard close). */
  durationMinutes: number
  totalQuestions: number
  totalMarks: number
  marksPerQuestion: number
  negativeMarking: INegativeMarking
  instructions: BilingualParagraphs
  resultPublication: IResultPublication
  status: LiveExamStatus
  createdAt?: Date
  updatedAt?: Date
}

export type LiveExamDocument = HydratedDocument<ILiveExam>

const liveExamSchema = new Schema<ILiveExam>(
  {
    title: bilingualField({ required: true }),
    description: bilingualField({ required: true }),
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    subjectIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length > 0,
        message: 'A Live Exam must cover at least one subject.',
      },
    },
    questionIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length > 0,
        message: 'A Live Exam must contain at least one question.',
      },
    },
    scheduledStartAt: { type: Date, required: true },
    scheduledEndAt: {
      type: Date,
      required: true,
      validate: {
        validator(this: ILiveExam, value: Date) {
          return value > this.scheduledStartAt
        },
        message: 'scheduledEndAt must be after scheduledStartAt.',
      },
    },
    durationMinutes: { type: Number, required: true, min: 1 },
    totalQuestions: { type: Number, required: true, min: 1 },
    totalMarks: { type: Number, required: true, min: 0 },
    marksPerQuestion: { type: Number, required: true, min: 0 },
    negativeMarking: { type: negativeMarkingSchema, default: () => ({}) },
    instructions: bilingualParagraphsField(),
    resultPublication: { type: resultPublicationSchema, default: () => ({}) },
    status: { type: String, enum: LIVE_EXAM_STATUSES, default: 'scheduled' },
  },
  { timestamps: true },
)

liveExamSchema.index({ status: 1, scheduledStartAt: 1 })
liveExamSchema.index({ examId: 1 })
// Backs Global Search's `$text` relevance-ranked query (Sprint 4 Step 63).
liveExamSchema.index({
  'title.en': 'text',
  'title.ta': 'text',
  'description.en': 'text',
  'description.ta': 'text',
})

export const LiveExam = model<ILiveExam>('LiveExam', liveExamSchema)
