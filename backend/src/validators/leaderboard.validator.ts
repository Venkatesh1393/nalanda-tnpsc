import { z } from 'zod'

import { LEADERBOARD_PERIODS } from '../constants/leaderboard'

export const leaderboardQuerySchema = z.object({
  period: z.enum(LEADERBOARD_PERIODS).default('overall'),
  limit: z.coerce.number().int().min(1).max(100).default(100),
})
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>

export const myPositionQuerySchema = z.object({
  period: z.enum(LEADERBOARD_PERIODS).default('overall'),
})
export type MyPositionQuery = z.infer<typeof myPositionQuerySchema>
