/**
 * Sprint 4 Step 60 — Adaptive Practice Engine. Every threshold the
 * recommendation logic uses lives here, mirroring `plans.config.ts`'s
 * "one file business rules trace back to, nothing else hardcodes a number"
 * pattern. This is deterministic, rule-based scoring — never an AI call
 * (no model is invoked anywhere in this feature).
 */
export const ADAPTIVE_PRACTICE_CONFIG = {
  /** Below this many attempts on a topic, its accuracy is too small a
   * sample to classify as weak/strong — same threshold
   * `analytics.service.ts` already uses, kept in sync deliberately. */
  minAttemptsForClassification: 5,
  /** Below this many attempts *at a specific difficulty within a topic*,
   * that difficulty's accuracy is too small a sample to drive a
   * suggested-difficulty decision — falls back to global difficulty
   * performance, then to a topic-accuracy heuristic. */
  minAttemptsForDifficultyConfidence: 3,

  // ---- priority-score boosts (all additive on top of `100 - accuracy`) ----
  /** A topic practiced (and still getting wrong) in the last N days matters
   * more than an old mistake — same recency-boost idea `getWeakAreas` uses. */
  recentMistakeHighBoostDays: 7,
  recentMistakeHighBoost: 15,
  recentMistakeLowBoostDays: 30,
  recentMistakeLowBoost: 7,
  /** A topic answered notably slower than the student's own overall average
   * response time signals "slow AND inaccurate" — the clearest sign it
   * needs attention. */
  slowResponseMultiplier: 1.2,
  slowResponseBoost: 10,
  /** A topic whose most recent attempts are trending down (vs its earlier
   * attempts) gets nudged up even if overall accuracy still looks fine. */
  decliningTrendBoost: 10,
  /** A topic not touched in a long time deserves a spaced-repetition
   * refresher regardless of how well it went last time. */
  lapsedDays: 45,
  lapsedRefresherBoost: 8,

  // ---- neutral base scores for topics that must never read as "weak" ----
  /** A topic with zero attempts — exploration-worthy, not a failure. Sits
   * below a genuinely weak topic's score but above a comfortably strong one. */
  newTopicBaseScore: 55,
  /** A topic with 1-4 attempts — not yet classifiable, gently prioritized to
   * finish building a reliable sample rather than treated as "weak". */
  partialDataBaseScore: 50,

  // ---- suggested question count per bucket — kept to the same values the
  // Smart Practice config screen already offers as chips (5/10/20/25,
  // `frontend/src/features/practice/components/mode-config-form.tsx`'s
  // `QUESTION_COUNT_OPTIONS`) so a recommendation deep-link always lands on
  // a real, already-selectable option instead of an orphaned custom number. ----
  questionCount: {
    /** Zero attempts — a small diagnostic batch, not an overwhelming one. */
    diagnostic: 5,
    /** 1-4 attempts — a bit more to reach classification threshold sooner. */
    partialData: 10,
    /** Weak / needs_improvement with a reliable sample — focused remediation. */
    focusedRemediation: 20,
    /** Good / strong — light maintenance practice. */
    maintenance: 10,
  },

  /** How many ranked candidates the engine returns as alternatives (feeds
   * Dashboard's Recommended Topics grid). */
  maxRecommendations: 5,

  // ---- anti-repetition (never show the identical "practice next" primary
  // pick call after call while nothing about the student's data changed) ----
  /** How many of the most-recently-shown primary picks count as "recently
   * shown" and get skipped over when choosing the next primary pick. */
  antiRepeatWindow: 3,
  /** A primary pick older than this many days no longer counts as "recently
   * shown" — a long-untouched recommendation is fair to resurface. */
  antiRepeatDays: 3,
} as const
