import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import {
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  TNPSC_EXAM_STAGES,
  type QuestionDifficulty,
  type QuestionType,
  type TnpscExamStage,
} from '../constants/practice'
import { bilingualField, type BilingualText } from './shared/bilingualText'
import { questionOptionSchema, type IQuestionOption } from './Question.model'

export const AI_QUESTION_DRAFT_STATUSES = ['pending', 'approved', 'rejected'] as const
export type AiQuestionDraftStatus = (typeof AI_QUESTION_DRAFT_STATUSES)[number]

/** The AI-call metadata for the batch this draft was generated in — kept in
 * its own nested object so it's structurally obvious this is provenance
 * data, never content. Never copied onto the real `Question` document a
 * draft is promoted into (`services/admin/adminAiQuestionGenerator.service.ts`'s
 * `approveDraft`) — that's this step's "store AI metadata separately"
 * requirement, satisfied by construction rather than by a later cleanup step. */
export interface IAiQuestionDraftGeneration {
  requestedBy: Types.ObjectId
  /** Groups every draft produced by one "Generate" click/provider call —
   * a single request can ask for up to `MAX_QUESTIONS_PER_BATCH` questions. */
  batchId: string
  promptVersion: string
  provider: string
  model: string
  tokenUsage?: { inputTokens: number; outputTokens: number }
  estimatedCostUsd?: number | null
}

const aiQuestionDraftGenerationSchema = new Schema<IAiQuestionDraftGeneration>(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: String, required: true },
    promptVersion: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    tokenUsage: {
      inputTokens: { type: Number, min: 0 },
      outputTokens: { type: Number, min: 0 },
    },
    estimatedCostUsd: { type: Number, default: undefined },
  },
  { _id: false },
)

/**
 * Sprint 4 Step 65 — AI Question Generator. A wholly separate collection
 * from `Question` — an AI-generated question is never live, never
 * queryable by any student-facing path, and never even a `Question`
 * document at all until `approveDraft` promotes it. This is the same
 * "invisible by construction, one explicit action flips it live" shape
 * `LiveExam.status: 'draft'` already established (see that model's header
 * comment) — deliberately *not* `Question.isActive` (a visibility toggle
 * for already-trusted content) or `CurrentAffair`'s `isActive`+`publishAt`
 * (a *scheduling* mechanism for already-approved content), since neither
 * is a review gate for not-yet-vetted AI output.
 *
 * `status: 'rejected'` drafts are kept, not deleted — a permanent record of
 * what was generated and declined, same "audit trail over silent deletion"
 * instinct as soft-delete elsewhere, scoped to just this lifecycle (no
 * `deletedAt`/restore concept applies here).
 */
export interface IAiQuestionDraft {
  examIds: Types.ObjectId[]
  subjectId: Types.ObjectId
  topicId: Types.ObjectId
  subtopicId: Types.ObjectId
  questionText: BilingualText
  options: IQuestionOption[]
  difficulty: QuestionDifficulty
  questionType: QuestionType
  explanation?: BilingualText
  isPreviousYear: boolean
  pyqYear?: number
  tnpscExamType?: TnpscExamStage
  tags: string[]
  status: AiQuestionDraftStatus
  reviewedBy?: Types.ObjectId
  reviewedAt?: Date
  rejectionReason?: string
  /** Set only once `status` becomes `'approved'` — the real `Question`
   * this draft was promoted into. */
  publishedQuestionId?: Types.ObjectId
  generation: IAiQuestionDraftGeneration
  createdAt?: Date
  updatedAt?: Date
}

export type AiQuestionDraftDocument = HydratedDocument<IAiQuestionDraft>

const CURRENT_YEAR = new Date().getFullYear()

const aiQuestionDraftSchema = new Schema<IAiQuestionDraft>(
  {
    examIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length > 0,
        message: 'A draft must apply to at least one exam.',
      },
    },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    subtopicId: { type: Schema.Types.ObjectId, ref: 'Subtopic', required: true },
    questionText: bilingualField({ required: true }),
    options: {
      type: [questionOptionSchema],
      required: true,
      // Same invariant as `Question.model.ts`'s own options validator —
      // duplicated rather than shared across models since a draft and a
      // real Question are deliberately separate schemas.
      validate: {
        validator(this: IAiQuestionDraft, options: IQuestionOption[]) {
          if (options.length < 2 || options.length > 6) return false
          const correctCount = options.filter((option) => option.isCorrect).length
          if (this.questionType === 'mcq_single') return correctCount === 1
          return correctCount >= 1
        },
        message:
          'Options must contain 2-6 entries; mcq_single questions need exactly one correct option, other types at least one.',
      },
    },
    difficulty: { type: String, enum: QUESTION_DIFFICULTIES, required: true },
    questionType: { type: String, enum: QUESTION_TYPES, default: 'mcq_single' },
    explanation: bilingualField({ requireAtLeastOne: false }),
    isPreviousYear: { type: Boolean, default: false },
    pyqYear: { type: Number, min: 1990, max: CURRENT_YEAR + 1 },
    tnpscExamType: { type: String, enum: TNPSC_EXAM_STAGES },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: AI_QUESTION_DRAFT_STATUSES,
      default: 'pending',
      required: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    publishedQuestionId: { type: Schema.Types.ObjectId, ref: 'Question' },
    generation: { type: aiQuestionDraftGenerationSchema, required: true },
  },
  { timestamps: true },
)

aiQuestionDraftSchema.index({ status: 1, createdAt: -1 })
aiQuestionDraftSchema.index({ 'generation.batchId': 1 })
aiQuestionDraftSchema.index({ 'generation.requestedBy': 1, createdAt: -1 })

export const AiQuestionDraft = model<IAiQuestionDraft>(
  'AiQuestionDraft',
  aiQuestionDraftSchema,
)
