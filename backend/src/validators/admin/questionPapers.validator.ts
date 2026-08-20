import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import { TNPSC_EXAM_STAGES } from '../../constants/practice'

const objectIdSchema = z.string().refine(isValidObjectId, 'Invalid id')
const requiredBilingualSchema = z.object({
  en: z.string().trim().min(1, 'English text is required'),
  ta: z.string().trim().optional(),
})

const CURRENT_YEAR = new Date().getFullYear()

const baseQuestionPaperFields = {
  examId: objectIdSchema,
  year: z.coerce.number().int().min(1990).max(CURRENT_YEAR + 1),
  title: requiredBilingualSchema,
  tnpscExamType: z.enum(TNPSC_EXAM_STAGES).optional(),
  isActive: z.boolean().default(true),
}

export const createQuestionPaperBodySchema = z.object(baseQuestionPaperFields)
export type CreateQuestionPaperBody = z.infer<typeof createQuestionPaperBodySchema>

export const updateQuestionPaperBodySchema = z.object(baseQuestionPaperFields).partial()
export type UpdateQuestionPaperBody = z.infer<typeof updateQuestionPaperBodySchema>

export const updateQuestionPaperStatusBodySchema = z.object({ isActive: z.boolean() })
export type UpdateQuestionPaperStatusBody = z.infer<
  typeof updateQuestionPaperStatusBodySchema
>

export const adminIdParamsSchema = z.object({ id: objectIdSchema })
export type AdminIdParams = z.infer<typeof adminIdParamsSchema>

export const listAdminQuestionPapersQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  examId: objectIdSchema.optional(),
  year: z.coerce.number().int().min(1990).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListAdminQuestionPapersQuery = z.infer<
  typeof listAdminQuestionPapersQuerySchema
>
