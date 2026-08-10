import type { SubscriptionTier } from './roles'

/**
 * Sprint 4 Step 59 — Nalanda AI Tutor. `ai_tutor` (constants/entitlements.ts)
 * already gates *whether* a tier can use the tutor at all (Pro/Institutional
 * only, per `config/plans.config.ts`); these are the *within-tier* usage
 * caps the task explicitly asks for ("conversation limits for premium
 * plans") — a real cost-control lever even for a paying tier, same
 * reasoning as `questionExplanation.service.ts#DAILY_GENERATION_QUOTA`.
 *
 * Chosen conservatively and documented here as the one place to retune —
 * not sourced from any doc (none specifies AI Tutor usage numbers), same
 * "arbitrary but explicit and adjustable" precedent as Step 57's quota.
 * `maxActiveConversations` bounds a student's total open threads (delete an
 * old one to make room — see `deleteConversation`); `dailyMessageLimit`
 * bounds provider spend per day, counted the same way Step 57/58 count
 * `question_explanation` generations (`source: 'generated'` `AIHistory`
 * rows for `feature: 'doubt_chatbot'` today).
 */
export interface AiTutorLimits {
  maxActiveConversations: number
  dailyMessageLimit: number
}

const DEFAULT_LIMITS: AiTutorLimits = {
  maxActiveConversations: 20,
  dailyMessageLimit: 30,
}

export const AI_TUTOR_LIMITS: Partial<Record<SubscriptionTier, AiTutorLimits>> = {
  pro: { maxActiveConversations: 20, dailyMessageLimit: 30 },
  institutional: { maxActiveConversations: 100, dailyMessageLimit: 150 },
}

/** Falls back to `DEFAULT_LIMITS` for any tier without an explicit entry —
 * defensive only, since `middleware/entitlement.middleware.ts#requireFeature`
 * already blocks every tier below Pro from reaching this code at all. */
export function getAiTutorLimits(tier: SubscriptionTier): AiTutorLimits {
  return AI_TUTOR_LIMITS[tier] ?? DEFAULT_LIMITS
}

/** Hard caps on request/content size — bound both provider token cost and
 * document size, independent of the daily-message/conversation-count quotas
 * above. */
export const MAX_MESSAGE_LENGTH = 2000
export const MAX_CONVERSATION_TITLE_LENGTH = 80
/** A lesson transcript or question block can be arbitrarily long content —
 * truncated to this many characters before entering the prompt so one
 * long lesson can't blow out token cost on every turn of a conversation
 * grounded in it. */
export const MAX_CONTEXT_CHARS = 4000
