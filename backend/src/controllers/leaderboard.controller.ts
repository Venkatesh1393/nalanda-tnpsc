import type { Request, Response } from 'express'

import * as leaderboardService from '../services/leaderboard.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import type {
  LeaderboardQuery,
  MyPositionQuery,
} from '../validators/leaderboard.validator'

export async function getLeaderboard(req: Request, res: Response): Promise<void> {
  const { period, limit } = req.query as unknown as LeaderboardQuery
  const entries = await leaderboardService.getLeaderboard(period, limit)
  sendSuccess(res, entries)
}

export async function getMyPosition(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { period } = req.query as unknown as MyPositionQuery
  const position = await leaderboardService.getMyPosition(req.user.sub, period)
  sendSuccess(res, position)
}
