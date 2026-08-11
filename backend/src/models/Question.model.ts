import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import {
  QUESTION_DIFFICULTIES,
  QUESTION_SOURCES,
  QUESTION_TYPES,
  TNPSC_EXAM_STAGES,
  type QuestionDifficulty,
  type QuestionSource,
  type QuestionType,
  type TnpscExamStage,
} from '../constants/practice'
import { bilingualField, type BilingualText } from './shared/bilingualText'
import {
  contentWorkflowPlugin,
  type WorkflowGoverned,
} from './shared/contentWorkflow.plugin'
import { softDeletePlugin, type SoftDeletable } from './shared/softDelete.plugin'

export interface IQuestionOption {
  optionId: string
  text: BilingualText
  isCorrect: boolean
}

/** Exported for `AiQuestionDraft.model.ts`'s reuse (Sprint 4 Step 65) — a
 * draft's content shape mirrors a real Question's exactly, so the same
 * embedded-option sub-schema and its invariants apply to both. */
export const questionOptionSchema = new Schema<IQuestionOption>(
  {
    optionId: { type: String, required: true },
    text: bilingualField({ required: true }),
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false },
)

/**
 * Options are embedded, never a standalone collection — the single
 * clearest embed-vs-reference call in `docs/Database.md` §2/§10 (small,
 * bounded 2-6 items, always read with the question, never queried alone).
 */
export interface IQuestion extends SoftDeletable, WorkflowGoverned {
  examIds: Types.ObjectId[] // denormalized — avoids a join chain for filtered practice-quiz generation
  subjectId: Types.ObjectId // denormalized
  topicId: Types.ObjectId // denormalized
  subtopicId: Types.ObjectId
  questionText: BilingualText
  questionImageUrl?: string
  /** Cloudinary public ID for `questionImageUrl` — required to delete/replace
   * the asset safely; undefined for questions with no uploaded image. */
  questionImagePublicId?: string
  options: IQuestionOption[]
  difficulty: QuestionDifficulty
  questionType: QuestionType
  explanation?: BilingualText
  source: QuestionSource
  isPreviousYear: boolean
  pyqYear?: number
  /** The exam *stage* this question was originally asked in (Prelims/Mains/
   * Interview) — distinct from `examIds` (which exams may practice it). */
  tnpscExamType?: TnpscExamStage
  tags: string[]
  isActive: boolean
  isPremium: boolean
  aiExplanationEligible: boolean
  /** Populated by Mongoose's `timestamps: true` below — declared here only so
   * TypeScript knows they exist on a hydrated document (the Admin Panel's
   * question list sorts/displays by these, Step 53). */
  createdAt?: Date
  updatedAt?: Date
}

export type QuestionDocument = HydratedDocument<IQuestion>

const CURRENT_YEAR = new Date().getFullYear()

const questionSchema = new Schema<IQuestion>(
  {
    examIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length > 0,
        message: 'A Question must apply to at least one exam.',
      },
    },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    subtopicId: { type: Schema.Types.ObjectId, ref: 'Subtopic', required: true },
    questionText: bilingualField({ required: true }),
    questionImageUrl: { type: String, trim: true },
    questionImagePublicId: { type: String, trim: true },
    options: {
      type: [questionOptionSchema],
      required: true,
      validate: {
        validator(this: IQuestion, options: IQuestionOption[]) {
          if (options.length < 2 || options.length > 6) return false
          const correctCount = options.filter((option) => option.isCorrect).length
          // docs/Database.md §7: schema validators can't reliably express
          // "exactly one" as a $jsonSchema rule, so it's enforced here at
          // the Mongoose layer instead — a real second line of defense
          // alongside whatever a future services/practice/ write path adds.
          if (this.questionType === 'mcq_single') return correctCount === 1
          return correctCount >= 1
        },
        message:
          'Options must contain 2-6 entries; mcq_single questions need exactly one correct option, other types at least one.',
      },
    },
    difficulty: {
      type: String,
      enum: QUESTION_DIFFICULTIES,
      required: true,
      default: 'medium',
    },
    questionType: { type: String, enum: QUESTION_TYPES, default: 'mcq_single' },
    explanation: bilingualField({ requireAtLeastOne: false }),
    source: { type: String, enum: QUESTION_SOURCES, required: true, default: 'curated' },
    isPreviousYear: { type: Boolean, default: false },
    pyqYear: {
      type: Number,
      min: 1990,
      max: CURRENT_YEAR + 1,
      validate: {
        validator(this: IQuestion, value: number | undefined) {
          return !this.isPreviousYear || value !== undefined
        },
        message: 'pyqYear is required when isPreviousYear is true.',
      },
    },
    tnpscExamType: { type: String, enum: TNPSC_EXAM_STAGES },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isPremium: { type: Boolean, default: false },
    aiExplanationEligible: { type: Boolean, default: true },
  },
  { timestamps: true },
)

questionSchema.plugin(softDeletePlugin)
questionSchema.plugin(contentWorkflowPlugin)
questionSchema.index({ subtopicId: 1, difficulty: 1 })
// A compound { examIds, tags } index is not possible — MongoDB rejects
// compound indexes across two multikey (array) fields ("cannot index
// parallel arrays"), a real constraint docs/Database.md §6's illustrative
// table didn't account for. Two single-field indexes instead; MongoDB can
// still intersect them for a combined filter, just less efficiently than
// one compound index would have been.
questionSchema.index({ examIds: 1 })
questionSchema.index({ tags: 1 })
questionSchema.index({ topicId: 1 })
questionSchema.index({ subjectId: 1 })
questionSchema.index({ source: 1, isPreviousYear: 1, pyqYear: 1 })
questionSchema.index({ isActive: 1 })
// Backs Global Search's `$text` relevance-ranked query (Sprint 4 Step 63) —
// `tags` can share the one-text-index-per-collection MongoDB allows here
// since it isn't already part of another *text* index.
questionSchema.index({
  'questionText.en': 'text',
  'questionText.ta': 'text',
  tags: 'text',
})

export const Question = model<IQuestion>('Question', questionSchema)
