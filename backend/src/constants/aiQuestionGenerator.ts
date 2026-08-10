/**
 * Sprint 4 Step 65 — Admin AI Question Generator. Chosen conservatively and
 * documented here as the one place to retune — not sourced from any doc,
 * same "arbitrary but explicit and adjustable" precedent as Step 57's
 * `DAILY_GENERATION_QUOTA` and Step 59's `AI_TUTOR_LIMITS`.
 */

/** Per admin, per day — counted the same way every other AI feature counts
 * its quota (`aiHistoryRepository.countGeneratedToday`, `source: 'generated'`
 * rows for `feature: 'question_generation'`). One "Generate" click is one
 * request regardless of how many questions it asks for. */
export const DAILY_GENERATION_REQUEST_LIMIT = 20

/** Per single "Generate" request — bounds one provider call's cost/latency
 * and keeps one review batch a manageable size for a human to review. */
export const MAX_QUESTIONS_PER_BATCH = 5

export const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 300
export const MAX_REJECTION_REASON_LENGTH = 500
