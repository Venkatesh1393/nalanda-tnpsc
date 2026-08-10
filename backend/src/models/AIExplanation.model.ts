import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import type { IAiTokenUsage } from './AIHistory.model'

/**
 * Sprint 4 Step 57 — the shared, reusable cache behind Premium AI
 * Explanation's "reuse where safe" cost-control requirement. Distinct from
 * `AIHistory` (a per-request audit log, one row per user per call): this is
 * the actual generated content, keyed so it can be served to *every*
 * premium student who hits the same question with the same answer in the
 * same language, not just the one who triggered the original generation.
 *
 * Cache key is `{questionId, selectedOptionId, language, promptVersion}` —
 * not just `questionId` — because "why is my answer wrong" is genuinely
 * different depending on which wrong option the student picked. A question
 * has at most a handful of options, so this stays small
 * (≤6 options × 2 languages × prompt versions in practice) while still
 * being pedagogically correct per selected answer. `selectedOptionId` is
 * the literal option id, or the sentinel `"unanswered"` for a skipped
 * question (never null/undefined, so it participates in the unique index).
 *
 * No TTL — unlike `AIHistory`, this is the expensive-to-regenerate asset the
 * whole caching strategy exists to preserve. A `promptVersion` bump is how
 * old entries get superseded (new version → new cache key → old rows just
 * age out of relevance, never read again, safe to leave or prune later).
 */
export interface IAIExplanation {
  questionId: Types.ObjectId
  selectedOptionId: string
  language: 'en' | 'ta'
  promptVersion: string
  provider: string
  model: string
  whyCorrectIsCorrect: string
  whyYourAnswerIsWrong: string | null
  keyConcept: string
  memoryTrick: string | null
  examRelevance: string | null
  tokenUsage?: IAiTokenUsage
  createdAt?: Date
}

export type AIExplanationDocument = HydratedDocument<IAIExplanation>

const aiTokenUsageSchema = new Schema<IAiTokenUsage>(
  {
    inputTokens: { type: Number, required: true, min: 0 },
    outputTokens: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const aiExplanationSchema = new Schema<IAIExplanation>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOptionId: { type: String, required: true, trim: true },
    language: { type: String, enum: ['en', 'ta'], required: true },
    promptVersion: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    whyCorrectIsCorrect: { type: String, required: true },
    whyYourAnswerIsWrong: { type: String, default: null },
    keyConcept: { type: String, required: true },
    memoryTrick: { type: String, default: null },
    examRelevance: { type: String, default: null },
    tokenUsage: { type: aiTokenUsageSchema },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

aiExplanationSchema.index(
  { questionId: 1, selectedOptionId: 1, language: 1, promptVersion: 1 },
  { unique: true },
)

export const AIExplanation = model<IAIExplanation>('AIExplanation', aiExplanationSchema)
