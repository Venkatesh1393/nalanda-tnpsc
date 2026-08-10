import type {
  LeaderboardEntry,
  LeaderboardScope,
  MyLeaderboardPosition,
} from '@/types/leaderboard'

/**
 * Mock implementation of the Leaderboard backend module (docs/API.md §9,
 * docs/Database.md §4.4) — no backend exists yet (Sprint 3), so the top-100
 * `entries` array and the current user's own position are both generated
 * here instead of a live `GET /leaderboard`/`GET /leaderboard/me` call.
 * `services/leaderboardService.ts` is the stable facade every component
 * imports from; only that file's function bodies need to change once a
 * real backend exists (swap the delegation below for `apiClient` calls) —
 * no consuming component needs to change either way.
 *
 * Cohort figures (`COHORT_SIZE`, `MY_POSITION`) are the **single source of
 * truth** other mock services key off of — `services/mock/dashboardMockService.ts`'s
 * `getRankSummary` and `services/mock/analyticsMockService.ts`'s rank/
 * percentile figures both import from here now, instead of each
 * independently hardcoding the same "percentile 82, rank #412 of 2,280"
 * numbers with just a comment to keep them in sync.
 */

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** A pool of realistic Tamil Nadu aspirant names — cycled with a last
 * initial to produce 100 distinct display names, the same "generate a
 * realistic shape rather than hand-author every row" precedent
 * `services/analyticsService.ts`'s bell-curve generator already set. */
const FIRST_NAMES = [
  'Karthik',
  'Priya',
  'Selvam',
  'Divya',
  'Muthu',
  'Kavya',
  'Arun',
  'Meena',
  'Suresh',
  'Anitha',
  'Ravi',
  'Lakshmi',
  'Vignesh',
  'Deepa',
  'Prabhu',
  'Saranya',
  'Manoj',
  'Nithya',
  'Senthil',
  'Vasanthi',
  'Gokul',
  'Swathi',
  'Bala',
  'Revathi',
  'Dinesh',
  'Kalaivani',
  'Naveen',
  'Pooja',
  'Rajesh',
  'Aishwarya',
]

const LAST_INITIALS = ['R', 'S', 'M', 'K', 'V', 'P', 'N', 'T', 'G', 'D']

function displayNameForRank(rank: number): string {
  const first = FIRST_NAMES[(rank - 1) % FIRST_NAMES.length]
  const last =
    LAST_INITIALS[Math.floor((rank - 1) / FIRST_NAMES.length) % LAST_INITIALS.length]
  return `${first} ${last}.`
}

/** A smooth, strictly-decreasing score curve (logarithmic falloff, like a
 * real ranked cohort's score distribution) rather than hand-authored
 * per-row scores — the same generated-not-authored precedent already used
 * for Analytics' bell curve. */
function scoreForRank(rank: number): number {
  return Math.round(980 - 60 * Math.log(rank + 1))
}

export const COHORT_SIZE = 2280

export const LEADERBOARD_ENTRIES: LeaderboardEntry[] = Array.from(
  { length: 100 },
  (_, i) => {
    const rank = i + 1
    return { rank, userDisplayName: displayNameForRank(rank), score: scoreForRank(rank) }
  },
)

const MY_RANK = 412

export const MY_POSITION: MyLeaderboardPosition = {
  rank: MY_RANK,
  score: scoreForRank(MY_RANK),
  percentile: Math.round((1 - MY_RANK / COHORT_SIZE) * 100),
}

export async function getLeaderboard(
  _scope: LeaderboardScope,
  _scopeRefId?: string,
): Promise<LeaderboardEntry[]> {
  // Scope/period filtering isn't meaningfully mockable without a real cohort
  // per liveExam/examCategory — this mock returns the same global-shaped
  // top-100 regardless, a documented simplification (docs/PROJECT_CONTEXT.md).
  return delay(LEADERBOARD_ENTRIES, 500)
}

export async function getMyLeaderboardPosition(
  _scope: LeaderboardScope,
  _scopeRefId?: string,
): Promise<MyLeaderboardPosition> {
  return delay(MY_POSITION, 400)
}
