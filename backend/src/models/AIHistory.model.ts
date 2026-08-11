import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import {
  AI_CONFIDENCE_LEVELS,
  AI_FEATURES,
  AI_FEEDBACK_VALUES,
  AI_HISTORY_SOURCES,
  AI_HISTORY_STATUSES,
  type AiConfidenceLevel,
  type AiFeature,
  type AiFeedback,
  type AiHistorySource,
  type AiHistoryStatus,
} from '../constants/ai'

export interface IAiTokenUsage {
  inputTokens: number
  outputTokens: number
}

const aiTokenUsageSchema = new Schema<IAiTokenUsage>(
  {
    inputTokens: { type: Number, required: true, min: 0 },
    outputTokens: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

/**
 * `expiresAt` implements docs/Database.md §9.3's *tiered* TTL (e.g.
 * `doubt_chatbot` interactions expire after ~12 months, `mains_evaluation`
 * is retained indefinitely) — a single TTL index can't vary its window by
 * document, so the expiry date itself is computed per-document at write
 * time (by whichever service creates the record, based on `feature`) and
 * left `undefined` for features that should never expire; MongoDB's TTL
 * monitor simply skips documents where the indexed field is absent.
 *
 * `questionId`/`provider`/`model`/`source`/`status`/`tokenUsage`/
 * `errorMessage` added for Sprint 4 Step 57 (Premium AI Explanation) — the
 * original scaffold (Sprint 3 Step 42) had no way to record which question
 * an interaction was about, which provider/model served it, whether it was
 * a fresh generation or a cache reuse, or whether it succeeded. `errorMessage`
 * is a short, safe, human-readable failure reason only — never a raw
 * provider error object, stack trace, or anything that could contain a
 * request payload or secret.
 *
 * `estimatedCostUsd` added for Sprint 4 Step 58 (AI Cost Optimization) — see
 * `constants/aiPricing.ts` for the calculation architecture. `null` means
 * "model not in the rate table" (never generated for this app's one model in
 * practice); `undefined`/absent means "not computed" (a failed request that
 * never reached the provider, or a pre-Step-58 row).
 *
 * `conversationId` added for Sprint 4 Step 59 (Nalanda AI Tutor) — links a
 * `feature: 'doubt_chatbot'` row back to its `AiConversation` thread. This
 * row never stores the actual message text (that's `AiMessage`, the
 * user-owned, deletable conversation content) — only usage metadata, same
 * "audit log, not content store" boundary Step 58's Admin AI Usage
 * dashboard relies on. `inputSummary`/`outputSummary` (dormant since the
 * Sprint 3 Step 42 scaffold) are used for the first time here, holding a
 * short truncated preview of the turn for quality-review purposes — never
 * the full message, and never the system prompt.
 *
 * `latencyMs` added for Sprint 4 Step 74 (Production Monitoring) — wall-clock
 * time of the actual provider call (`client.messages.parse(...)`, including
 * the SDK's own internal retries), measured at each of the three call sites
 * (`services/ai/questionExplanation.service.ts`,
 * `services/ai/aiTutor.service.ts`,
 * `services/admin/adminAiQuestionGenerator.service.ts`). Left `undefined`
 * for rows where no provider call was attempted (daily-quota-exceeded,
 * provider-not-configured) — those have no latency to report, not a zero.
 */
export interface IAIHistory {
  userId: Types.ObjectId
  feature: AiFeature
  /** Only set for question-scoped features (`question_explanation`) — the
   * other features (chatbot, study plan, ...) aren't tied to one question. */
  questionId?: Types.ObjectId
  /** Only set for `feature: 'doubt_chatbot'` rows (Sprint 4 Step 59). */
  conversationId?: Types.ObjectId
  promptVersion: string
  provider?: string
  model?: string
  source?: AiHistorySource
  status?: AiHistoryStatus
  tokenUsage?: IAiTokenUsage
  estimatedCostUsd?: number | null
  latencyMs?: number
  errorMessage?: string
  inputSummary?: string
  outputSummary?: string
  confidenceFlag?: AiConfidenceLevel
  userFeedback: AiFeedback
  expiresAt?: Date
  createdAt?: Date
}

export type AIHistoryDocument = HydratedDocument<IAIHistory>

const aiHistorySchema = new Schema<IAIHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    feature: { type: String, enum: AI_FEATURES, required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
    conversationId: { type: Schema.Types.ObjectId, ref: 'AiConversation' },
    promptVersion: { type: String, required: true, trim: true },
    provider: { type: String, trim: true },
    model: { type: String, trim: true },
    source: { type: String, enum: AI_HISTORY_SOURCES },
    status: { type: String, enum: AI_HISTORY_STATUSES },
    tokenUsage: { type: aiTokenUsageSchema },
    estimatedCostUsd: { type: Number, default: undefined },
    latencyMs: { type: Number, min: 0, default: undefined },
    errorMessage: { type: String, trim: true, maxlength: 500 },
    inputSummary: { type: String, trim: true },
    outputSummary: { type: String, trim: true },
    confidenceFlag: { type: String, enum: AI_CONFIDENCE_LEVELS },
    userFeedback: { type: String, enum: AI_FEEDBACK_VALUES, default: 'none' },
    expiresAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

aiHistorySchema.index({ userId: 1, feature: 1, createdAt: -1 })
aiHistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
// Sprint 4 Step 58 — Admin AI Usage dashboard queries scan by feature +
// createdAt range across every user, so they can't use the userId-led index
// above; this is the index that makes "today's requests" cheap at scale.
aiHistorySchema.index({ feature: 1, createdAt: -1 })

export const AIHistory = model<IAIHistory>('AIHistory', aiHistorySchema)
