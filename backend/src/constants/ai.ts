/**
 * `docs/Database.md` §4.8's `AIHistory` enums. `question_explanation` added
 * for Sprint 4 Step 57 (Premium AI Explanation) — a per-question, per-answer
 * explanation distinct from the free-form `doubt_chatbot`, same "minimal
 * extension" precedent as Step 52's role taxonomy decision. `question_generation`
 * added for Sprint 4 Step 65 (Admin AI Question Generator) — an admin-only,
 * multi-question-per-call feature, distinct from `question_explanation`
 * (student-facing, one question at a time).
 */
export const AI_FEATURES = [
  'doubt_chatbot',
  'mains_evaluation',
  'study_plan',
  'current_affairs_summary',
  'adaptive_difficulty',
  'question_explanation',
  'question_generation',
] as const
export type AiFeature = (typeof AI_FEATURES)[number]

export const AI_CONFIDENCE_LEVELS = ['high', 'low', 'escalated'] as const
export type AiConfidenceLevel = (typeof AI_CONFIDENCE_LEVELS)[number]

export const AI_FEEDBACK_VALUES = ['up', 'down', 'none'] as const
export type AiFeedback = (typeof AI_FEEDBACK_VALUES)[number]

/** Sprint 4 Step 57 — whether an `AIHistory` row represents a fresh
 * provider call or a reuse of an existing `AIExplanation` cache entry. Only
 * `'generated'` rows count against a user's daily quota — a cache hit costs
 * nothing, so it shouldn't spend the user's allowance. */
export const AI_HISTORY_SOURCES = ['generated', 'cached'] as const
export type AiHistorySource = (typeof AI_HISTORY_SOURCES)[number]

export const AI_HISTORY_STATUSES = ['success', 'failure'] as const
export type AiHistoryStatus = (typeof AI_HISTORY_STATUSES)[number]
