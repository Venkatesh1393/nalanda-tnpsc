import type { Request, Response } from 'express'

import * as leaderboardService from '../services/leaderboard.service'
import { sendSuccess } from '../utils/ApiResponse'
import type { TopRankersQuery } from '../validators/public.validator'

/**
 * Real as of the Leaderboard step — `PlatformStats`/`Testimonials`/
 * `SuccessStories` (docs/API.md §17) are out of this step's scope and stay
 * on the frontend's mock (`services/mock/publicMockService.ts`), unchanged;
 * only Top Rankers was explicitly required to connect to the same real
 * backend source the authenticated Leaderboard reads.
 */
export async function getTopRankers(req: Request, res: Response): Promise<void> {
  const { limit } = req.query as unknown as TopRankersQuery
  const rankers = await leaderboardService.getPublicTopRankers(limit)
  sendSuccess(res, rankers)
}
