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
import { questionOptionSchema, type IQuestionOption } from './Question.model'

export const QUESTION_VERSION_CHANGE_TYPES = [
  'create',
  'update',
  'bulkImport',
  'bulkUpdate',
  'rollback',
] as const
export type QuestionVersionChangeType = (typeof QUESTION_VERSION_CHANGE_TYPES)[number]

/** Every `IQuestion` content field except `workflow`/`deletedAt`/timestamps
 * — this is a content-history record, not a workflow-state history (the
 * workflow's own transitions are covered by `AuditLog` instead). */
export interface IQuestionVersionSnapshot {
  examIds: Types.ObjectId[]
  subjectId: Types.ObjectId
  topicId: Types.ObjectId
  subtopicId: Types.ObjectId
  questionText: BilingualText
  questionImageUrl?: string
  options: IQuestionOption[]
  difficulty: QuestionDifficulty
  questionType: QuestionType
  explanation?: BilingualText
  source: QuestionSource
  isPreviousYear: boolean
  pyqYear?: number
  tnpscExamType?: TnpscExamStage
  tags: string[]
  isActive: boolean
  isPremium: boolean
  aiExplanationEligible: boolean
}

const questionVersionSnapshotSchema = new Schema<IQuestionVersionSnapshot>(
  {
    examIds: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    subtopicId: { type: Schema.Types.ObjectId, ref: 'Subtopic', required: true },
    questionText: bilingualField({ required: true }),
    questionImageUrl: { type: String, trim: true },
    options: { type: [questionOptionSchema], required: true },
    difficulty: { type: String, enum: QUESTION_DIFFICULTIES, required: true },
    questionType: { type: String, enum: QUESTION_TYPES, required: true },
    explanation: bilingualField({ requireAtLeastOne: false }),
    source: { type: String, enum: QUESTION_SOURCES, required: true },
    isPreviousYear: { type: Boolean, required: true },
    pyqYear: { type: Number },
    tnpscExamType: { type: String, enum: TNPSC_EXAM_STAGES },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, required: true },
    isPremium: { type: Boolean, required: true },
    aiExplanationEligible: { type: Boolean, required: true },
  },
  { _id: false },
)

/**
 * Sprint 4 Step 71.5 — one append-only row per content change to a
 * `Question`, full-document snapshots rather than field-level diffs
 * (simpler, still fully supports rollback — matches this codebase's
 * consistent preference for straightforward mechanisms over clever ones,
 * e.g. `AiQuestionDraft`'s "keep rejected drafts, never delete" precedent).
 * A rollback (`services/admin/questionVersion.service.ts`) *creates* a new
 * version restoring old content rather than deleting anything newer —
 * history here is genuinely append-only, never rewritten.
 */
export interface IQuestionVersion {
  questionId: Types.ObjectId
  versionNumber: number
  snapshot: IQuestionVersionSnapshot
  changeType: QuestionVersionChangeType
  changedBy: Types.ObjectId
  changedByEmail: string
  changeNote?: string
  createdAt?: Date
}

export type QuestionVersionDocument = HydratedDocument<IQuestionVersion>

const questionVersionSchema = new Schema<IQuestionVersion>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    versionNumber: { type: Number, required: true, min: 1 },
    snapshot: { type: questionVersionSnapshotSchema, required: true },
    changeType: { type: String, enum: QUESTION_VERSION_CHANGE_TYPES, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedByEmail: { type: String, required: true, trim: true },
    changeNote: { type: String, trim: true, maxlength: 500 },
  },
  // No `updatedAt` — a version row is immutable by design, same reasoning
  // as `AuditLog.model.ts`.
  { timestamps: { createdAt: true, updatedAt: false } },
)

questionVersionSchema.index({ questionId: 1, versionNumber: -1 }, { unique: true })

export const QuestionVersion = model<IQuestionVersion>(
  'QuestionVersion',
  questionVersionSchema,
)
