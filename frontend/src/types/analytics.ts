/**
 * Analytics module DTOs (docs/Analytics.md, docs/Database.md §4.4) — one
 * type per chart, mirroring the `types/dashboard.ts`/`types/learn.ts`
 * convention. No backend exists yet (docs/MASTER_ROADMAP.md Phase 5), so
 * every field here is already the shape a real materialized `Analytics`
 * document would hand back — swapping the mocked service for a real one
 * later shouldn't require touching these types.
 */

export type AnalyticsSummary = {
  overallPercentile: number
  overallAccuracy: number
  totalQuestionsAttempted: number
  currentStreak: number
  lastUpdatedAt: string
  /** `false` for a brand-new user with zero `QuestionAttempt`s — the
   * Analytics page's top-level empty-state gate (docs/Analytics.md §1's
   * "never show fake charts to a new user" rule) reads this instead of any
   * individual chart having to know about emptiness itself. */
  hasActivity: boolean
}

/** Subject Accuracy — horizontal bars, sorted weakest-first
 * (docs/Analytics.md §2). */
export type SubjectAccuracyPoint = {
  subject: string
  accuracy: number
}

/** Weekly Study Time — the one vertical-bar chart in the module
 * (docs/Analytics.md §12 — chronological, left-to-right reads more
 * naturally than a ranked horizontal list). */
export type WeeklyStudyTimePoint = {
  label: string
  minutes: number
}

/** Monthly Progress — overall exam-readiness trend over the last several
 * months, reusing the same smooth-area `TrendLineChart` treatment as the
 * Dashboard's Weekly Progress widget. */
export type MonthlyProgressPoint = {
  label: string
  percent: number
}

/** Weak/Strong Areas — topic-level accuracy, each carrying its parent
 * subject so a chart tooltip/label can show both. */
export type TopicAccuracyPoint = {
  topic: string
  subject: string
  accuracy: number
}

/** Practice History — score per recent session, chronological
 * (docs/Analytics.md's "effort vs. performance" distinction — this is the
 * performance side). */
export type PracticeHistoryPoint = {
  label: string
  mode: string
  scorePercent: number
}

/** Speed Analysis — the user's own average time-per-question against a
 * cohort benchmark, per subject, two series side by side
 * (docs/Analytics.md §6). */
export type SpeedAnalysisPoint = {
  subject: string
  yourSeconds: number
  benchmarkSeconds: number
}

/** Rank Prediction — a bell-curve distribution plus the user's marked
 * position on it (docs/Analytics.md §11). `curve` is a smooth reference
 * shape, not per-user content, so it's generated rather than hand-authored. */
export type RankPredictionData = {
  curve: { percentile: number; density: number }[]
  percentile: number
  rankEstimate: number
  cohortSize: number
  /** True when the cohort is too small for a confident estimate
   * (docs/Analytics.md §11's "small-cohort honesty" rule) — the chart shows
   * a disclaimer rather than presenting the number with false confidence. */
  isSmallCohort?: boolean
}

/** Goal Completion — progress toward the user's active exam goal. */
export type GoalCompletionData = {
  percentComplete: number
  examLabel: string
  targetDate: string
  daysRemaining: number
}

/** Question Difficulty (docs/Analytics.md's difficulty breakdown) — accuracy
 * by Easy/Medium/Hard, shown only once a difficulty band has enough
 * attempts to avoid a misleadingly precise bar. */
export type DifficultyAccuracyPoint = {
  difficulty: string
  attempted: number
  accuracy: number
}
