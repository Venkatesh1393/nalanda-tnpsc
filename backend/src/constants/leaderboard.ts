/** Kept identical to `frontend/src/types/leaderboard.ts`'s `LeaderboardScope`. */
export const LEADERBOARD_SCOPES = ['liveExam', 'examCategory', 'global'] as const
export type LeaderboardScope = (typeof LEADERBOARD_SCOPES)[number]

/**
 * The real Leaderboard backend step's period axis — independent of `scope`
 * above (this step only implements `scope: 'global'`, per its own explicit
 * "Weekly/Monthly/Overall" requirement; `liveExam`/`examCategory` scoping is
 * unbuilt, same as before). See `services/leaderboard.service.ts`'s header
 * comment for the exact window each period resolves to and the documented
 * ranking formula.
 */
export const LEADERBOARD_PERIODS = ['weekly', 'monthly', 'overall'] as const
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number]

/** Minimum answered questions (within the selected period window) before a
 * user is ranked at all — prevents a single lucky session from topping the
 * board on a tiny sample, the same classification-minimum precedent
 * `services/analytics.service.ts` already established. */
export const MIN_ATTEMPTS_FOR_LEADERBOARD = 5
