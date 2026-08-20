import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import { TNPSC_EXAM_STAGES } from '../constants/practice'

const objectIdSchema = z.string().refine(isValidObjectId, 'Invalid id')

export const listQuerySchema = z.object({
  examId: objectIdSchema.optional(),
  year: z.coerce.number().int().min(1990).optional(),
  tnpscExamType: z.enum(TNPSC_EXAM_STAGES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type ListQuery = z.infer<typeof listQuerySchema>

export const idParamsSchema = z.object({
  id: objectIdSchema,
})
export type IdParams = z.infer<typeof idParamsSchema>
