import { z } from 'zod'

export const topicsQuerySchema = z.object({
  subjectId: z.string().optional(),
})
export type TopicsQuery = z.infer<typeof topicsQuerySchema>

export const areasQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
})
export type AreasQuery = z.infer<typeof areasQuerySchema>

export const practiceHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(8),
})
export type PracticeHistoryQuery = z.infer<typeof practiceHistoryQuerySchema>
