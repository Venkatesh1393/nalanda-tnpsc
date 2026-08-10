/**
 * Leaderboard DTOs (docs/API.md §9, docs/Database.md §4.4's `Leaderboards`
 * collection). Field names match the documented wire shape exactly —
 * `entries` is capped to top 100 in both the real spec and this mock, never
 * an unbounded array (the same anti-pattern already called out for
 * `LiveExams.registeredUserIds`).
 */

export type LeaderboardScope = 'liveExam' | 'examCategory' | 'global'

/** The real Leaderboard backend's period axis (`backend/src/constants/
 * leaderboard.ts`) — independent of `scope` above, which only `'global'`
 * actually implements today. See `services/leaderboard.service.ts`'s
 * (backend) header comment for the documented ranking formula and exactly
 * what date window each period resolves to. */
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'overall'

export type LeaderboardEntry = {
  rank: number
  userDisplayName: string
  score: number
}

/** `GET /leaderboard/me` — a user outside the top 100 is computed on-demand
 * from Analytics rather than stored in `entries`, per Database.md §4.4. */
export type MyLeaderboardPosition = {
  rank: number
  score: number
  percentile: number
  /** Real cohort-size/small-cohort/not-yet-ranked signals — additive,
   * optional (the mock never set these; the real backend always does). */
  cohortSize?: number
  isSmallCohort?: boolean
  hasEnoughData?: boolean
}
