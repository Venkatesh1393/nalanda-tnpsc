import {
  MIN_ATTEMPTS_FOR_LEADERBOARD,
  type LeaderboardPeriod,
} from '../constants/leaderboard'
import * as leaderboardRepository from '../repositories/leaderboard.repository'
import type { UserPeriodStats } from '../repositories/leaderboard.repository'
import * as profileRepository from '../repositories/profile.repository'
import { cacheKey, CACHE_TTL, getCache } from '../config/cache'
import { resolveExamCode } from './learn.service'

/**
 * Real Leaderboard (no `Leaderboard` model writes — see the header note on
 * `repositories/leaderboard.repository.ts` and `services/analytics.service.ts`'s
 * identical "live aggregation stands in for a materialized view at this data
 * volume" precedent; the `Leaderboard` collection, modeled since Step 42,
 * stays dormant, the natural home for this once a background-job scheduler
 * exists).
 *
 * ---- Ranking formula (documented, deterministic — never invented) ----
 * A user must have answered at least `MIN_ATTEMPTS_FOR_LEADERBOARD` (5)
 * questions across their submitted `PracticeSession`s within the selected
 * period window before they're ranked at all — a single lucky session can
 * never top the board.
 *
 *   score = correctCount * 10 + round(accuracyPercent)
 *
 * `correctCount` (real practice *volume* that was actually correct) is the
 * dominant term — it can't be gamed by answering one question correctly,
 * and scales with genuine effort. `accuracyPercent` (0-100) is a smaller
 * additive term that only meaningfully re-orders users of *similar* volume
 * — it can never let a single highly-accurate-but-low-volume session
 * outrank a consistently active high-volume student, since one full extra
 * correct answer (+10) always outweighs the entire possible accuracy
 * range's influence at comparable scale. Both terms come directly from
 * `PracticeSession.result`, the same fields Practice's own Result screen
 * already shows the student — nothing here is derived from a hidden or
 * unexplainable signal.
 *
 * Periods: `weekly` = submitted in the last 7 rolling days; `monthly` =
 * submitted in the current calendar month (UTC); `overall` = all-time, no
 * date filter. Only `scope: 'global'` is implemented (this step's explicit
 * "Weekly/Monthly/Overall" requirement is a period axis, not a
 * liveExam/examCategory scope axis).
 */

const SMALL_COHORT_THRESHOLD = 20
const DAY_MS = 24 * 60 * 60 * 1000

function windowFor(period: LeaderboardPeriod): { from?: Date; to?: Date } {
  if (period === 'overall') return {}
  const now = new Date()
  if (period === 'weekly') return { from: new Date(now.getTime() - 7 * DAY_MS) }
  return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) }
}

function accuracyOf(row: UserPeriodStats): number {
  return row.totalQuestions > 0 ? (row.correctCount / row.totalQuestions) * 100 : 0
}

function scoreOf(row: UserPeriodStats): number {
  return row.correctCount * 10 + Math.round(accuracyOf(row))
}

interface RankedRow extends UserPeriodStats {
  score: number
}

/**
 * Sprint 4 Step 67 — this is a live aggregation over every `PracticeSession`
 * in the window (see the header note above on why no materialized
 * `Leaderboard` write exists yet), and all three exported functions below
 * call it independently. Caching it for `CACHE_TTL.SHORT` (60s) means a
 * burst of leaderboard/my-position/top-rankers requests in that window — the
 * common case, since a single Leaderboard page view can trigger more than
 * one of these — shares one aggregation instead of re-running it per call,
 * while still feeling close to live (a new practice session can take up to a
 * minute to move someone's rank).
 */
async function getEligibleRankedRows(period: LeaderboardPeriod): Promise<RankedRow[]> {
  const key = cacheKey('leaderboard', 'ranked', period)
  return getCache().wrap(key, CACHE_TTL.SHORT, async () => {
    const { from, to } = windowFor(period)
    const rows = await leaderboardRepository.getPeriodStats(from, to)
    return rows
      .filter((row) => row.attempted >= MIN_ATTEMPTS_FOR_LEADERBOARD)
      .map((row) => ({ ...row, score: scoreOf(row) }))
      .sort((a, b) => b.score - a.score)
  })
}

/** "First L." — a privacy-conscious display name derived from a real
 * `Profile.name`, never the full name verbatim. Used everywhere a
 * leaderboard/ranking figure might be shown to other users (including the
 * unauthenticated public Top Rankers preview). */
function toDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Aspirant'
  if (parts.length === 1) return parts[0]!
  const first = parts[0]!
  const lastInitial = parts[parts.length - 1]!.charAt(0).toUpperCase()
  return `${first} ${lastInitial}.`
}

export interface LeaderboardEntryDTO {
  rank: number
  userDisplayName: string
  score: number
}

export async function getLeaderboard(
  period: LeaderboardPeriod,
  limit: number,
): Promise<LeaderboardEntryDTO[]> {
  const ranked = await getEligibleRankedRows(period)
  const top = ranked.slice(0, limit)
  if (top.length === 0) return []

  const profiles = await profileRepository.findByUserIds(top.map((row) => row.userId))
  const nameByUserId = new Map(profiles.map((p) => [p.userId.toString(), p.name]))

  return top.map((row, index) => ({
    rank: index + 1,
    userDisplayName: toDisplayName(nameByUserId.get(row.userId.toString()) ?? 'Aspirant'),
    score: row.score,
  }))
}

export interface MyLeaderboardPositionDTO {
  rank: number
  score: number
  percentile: number
  cohortSize: number
  isSmallCohort: boolean
  /** `false` when the student hasn't met `MIN_ATTEMPTS_FOR_LEADERBOARD` yet
   * within this period — `rank`/`score`/`percentile` are all `0`, an honest
   * "not ranked yet" rather than a fabricated position. */
  hasEnoughData: boolean
}

export async function getMyPosition(
  userId: string,
  period: LeaderboardPeriod,
): Promise<MyLeaderboardPositionDTO> {
  const ranked = await getEligibleRankedRows(period)
  const cohortSize = ranked.length
  const isSmallCohort = cohortSize < SMALL_COHORT_THRESHOLD
  const index = ranked.findIndex((row) => row.userId.toString() === userId)

  if (index === -1) {
    return {
      rank: 0,
      score: 0,
      percentile: 0,
      cohortSize,
      isSmallCohort,
      hasEnoughData: false,
    }
  }

  const rank = index + 1
  const percentile =
    cohortSize > 0 ? Math.round(((cohortSize - rank) / cohortSize) * 100) : 0
  return {
    rank,
    score: ranked[index]!.score,
    percentile,
    cohortSize,
    isSmallCohort,
    hasEnoughData: true,
  }
}

export interface TopRankerDTO {
  rank: number
  displayName: string
  examCategory: string
  percentile: number
}

/** Powers the public (unauthenticated) Landing Page Top Rankers section —
 * real ranked users only, `overall` period, filtered to students who have
 * an actual primary exam goal set (never a fabricated fallback category).
 * Returns fewer than `limit` entries (down to none) rather than padding
 * with anything invented. */
export async function getPublicTopRankers(limit: number): Promise<TopRankerDTO[]> {
  const ranked = await getEligibleRankedRows('overall')
  if (ranked.length === 0) return []

  // Over-fetch a little before the exam-goal filter, so a handful of
  // goal-less top scorers doesn't silently shrink the final list below
  // `limit` when avoidable.
  const candidates = ranked.slice(0, limit * 3)
  const profiles = await profileRepository.findByUserIds(
    candidates.map((row) => row.userId),
  )
  const profileByUserId = new Map(profiles.map((p) => [p.userId.toString(), p]))

  const results: TopRankerDTO[] = []
  for (const row of candidates) {
    if (results.length >= limit) break
    const profile = profileByUserId.get(row.userId.toString())
    const primaryGoal =
      profile?.examGoals.find((goal) => goal.isPrimary) ?? profile?.examGoals[0]
    if (!profile || !primaryGoal) continue
    const examCategory = await resolveExamCode(primaryGoal.examId)
    if (!examCategory) continue

    const percentile =
      ranked.length > 0
        ? Math.round(((ranked.length - (results.length + 1)) / ranked.length) * 100)
        : 0
    results.push({
      rank: results.length + 1,
      displayName: toDisplayName(profile.name),
      examCategory,
      percentile,
    })
  }
  return results
}

export type { LeaderboardPeriod }
