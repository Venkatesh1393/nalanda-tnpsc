import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardScope,
  MyLeaderboardPosition,
} from '@/types/leaderboard'

/**
 * Domain calls for the real Leaderboard backend
 * (`backend/src/routes/leaderboard.routes.ts`) — replaces
 * `services/mock/leaderboardMockService.ts`. `scope` stays in every
 * function's signature (only `'global'` is actually implemented server-side
 * — `liveExam`/`examCategory` scoping is unbuilt, matching the doc's
 * original param even though this step only required a period axis), and
 * `period` (`weekly`/`monthly`/`overall`, default `'overall'`) is a new,
 * additive parameter — there were zero existing callers of either function
 * before this step (no Leaderboard page/UI exists yet), so this is a safe,
 * non-breaking signature change.
 */

interface ApiEnvelope<T> {
  data: T
}

export async function getLeaderboard(
  _scope: LeaderboardScope = 'global',
  _scopeRefId?: string,
  period: LeaderboardPeriod = 'overall',
): Promise<LeaderboardEntry[]> {
  const response = await apiClient.get<ApiEnvelope<LeaderboardEntry[]>>(
    endpoints.leaderboard.list,
    { params: { period } },
  )
  return response.data.data
}

export async function getMyLeaderboardPosition(
  _scope: LeaderboardScope = 'global',
  _scopeRefId?: string,
  period: LeaderboardPeriod = 'overall',
): Promise<MyLeaderboardPosition> {
  const response = await apiClient.get<ApiEnvelope<MyLeaderboardPosition>>(
    endpoints.leaderboard.me,
    { params: { period } },
  )
  return response.data.data
}
