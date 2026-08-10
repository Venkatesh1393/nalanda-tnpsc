import { z } from 'zod'

export const topRankersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(6),
})
export type TopRankersQuery = z.infer<typeof topRankersQuerySchema>
