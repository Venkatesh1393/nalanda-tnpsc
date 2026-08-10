import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import {
  CURRENT_AFFAIRS_CATEGORIES,
  CURRENT_AFFAIRS_PERIODS,
  type CurrentAffairsCategory,
  type CurrentAffairsPeriod,
} from '../constants/currentAffairs'
import {
  bilingualField,
  bilingualParagraphsField,
  type BilingualParagraphs,
  type BilingualText,
} from './shared/bilingualText'
import { softDeletePlugin, type SoftDeletable } from './shared/softDelete.plugin'

export interface ICurrentAffairQuizOption {
  optionId: string
  text: BilingualText
}

/**
 * The per-article self-contained comprehension quiz (distinct from
 * `quizQuestionIds` below) — embedded rather than a `Question` reference,
 * since this is a lightweight, ungraded, immediately-answer-revealing check
 * (the already-shipped frontend `QuizDialog` shows `correctOptionId`/
 * `explanation` as soon as a student answers, never routed through
 * `QuestionAttempt`/session tracking) — a genuinely different content
 * domain and leakage model from the TNPSC syllabus `Question` bank, so
 * reusing that collection's stricter pre-answer sanitization rules here
 * would be a mismatched fit, not a simplification.
 */
export interface ICurrentAffairQuizQuestion {
  questionId: string
  questionText: BilingualText
  options: ICurrentAffairQuizOption[]
  correctOptionId: string
  explanation: BilingualText
}

const currentAffairQuizOptionSchema = new Schema<ICurrentAffairQuizOption>(
  {
    optionId: { type: String, required: true },
    text: bilingualField({ required: true }),
  },
  { _id: false },
)

const currentAffairQuizQuestionSchema = new Schema<ICurrentAffairQuizQuestion>(
  {
    questionId: { type: String, required: true },
    questionText: bilingualField({ required: true }),
    options: { type: [currentAffairQuizOptionSchema], default: [] },
    correctOptionId: { type: String, required: true },
    explanation: bilingualField({ required: true }),
  },
  { _id: false },
)

export interface ICurrentAffair extends SoftDeletable {
  date: Date
  period: CurrentAffairsPeriod
  category: CurrentAffairsCategory
  title: BilingualText
  /** A hand-picked ~140-char teaser (docs/API.md §13) — kept as authored
   * content, not a truncation of `body`, since a good excerpt is usually a
   * deliberate editorial choice rather than "the first N characters." */
  excerpt?: BilingualText
  body: BilingualParagraphs
  highlights: BilingualParagraphs
  examRelevanceTags: string[]
  /** General topical tags (e.g. "Economy", "ISRO") — distinct from
   * `examRelevanceTags`, which are TNPSC-syllabus-mapped labels
   * (e.g. "GroupI-Mains-Ethics"). Both are real, independently authored
   * fields, not derived from one another. */
  tags: string[]
  isImportant: boolean
  imageUrl?: string
  imageAlt?: string
  /** Cloudinary public ID for `imageUrl` — required to delete/replace the
   * asset safely; undefined for articles with no uploaded image. */
  imagePublicId?: string
  /** "Related questions" — real TNPSC-syllabus `Question` references, for a
   * student who wants to practice adjacent exam content, never the
   * per-article comprehension quiz itself (see `quizQuestions` below). */
  quizQuestionIds: Types.ObjectId[]
  quizQuestions: ICurrentAffairQuizQuestion[]
  aiSummaryVersion?: string
  isActive: boolean
  /** Sprint 4 Step 54 — "schedule/publish" support, reusing `isActive` as the
   * master on/off switch every other content model already uses (never a
   * parallel draft/published enum). `undefined`/past = publish immediately
   * once `isActive: true`; future = scheduled (`isActive: true` but not yet
   * publicly visible). Every existing seeded article predates this field and
   * has it `undefined`, so it's treated as "always publish-eligible" —
   * zero behavior change for content that existed before this step. */
  publishAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export type CurrentAffairDocument = HydratedDocument<ICurrentAffair>

const currentAffairSchema = new Schema<ICurrentAffair>(
  {
    date: { type: Date, required: true },
    period: { type: String, enum: CURRENT_AFFAIRS_PERIODS, required: true },
    category: { type: String, enum: CURRENT_AFFAIRS_CATEGORIES, required: true },
    title: bilingualField({ required: true }),
    excerpt: bilingualField({ requireAtLeastOne: false }),
    body: bilingualParagraphsField(),
    highlights: bilingualParagraphsField(),
    examRelevanceTags: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    isImportant: { type: Boolean, default: false },
    imageUrl: { type: String, trim: true },
    imageAlt: { type: String, trim: true },
    imagePublicId: { type: String, trim: true },
    quizQuestionIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
      default: [],
    },
    quizQuestions: { type: [currentAffairQuizQuestionSchema], default: [] },
    aiSummaryVersion: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    publishAt: { type: Date },
  },
  { timestamps: true },
)

currentAffairSchema.plugin(softDeletePlugin)
currentAffairSchema.index({ date: -1 })
currentAffairSchema.index({ examRelevanceTags: 1 })
currentAffairSchema.index({ tags: 1 })
currentAffairSchema.index({ period: 1, date: -1 })
currentAffairSchema.index({ category: 1, date: -1 })
// Backs Global Search's `$text` relevance-ranked query (Sprint 4 Step 63).
currentAffairSchema.index({
  'title.en': 'text',
  'title.ta': 'text',
  'excerpt.en': 'text',
  'excerpt.ta': 'text',
  tags: 'text',
  examRelevanceTags: 'text',
})

export const CurrentAffair = model<ICurrentAffair>('CurrentAffair', currentAffairSchema)
