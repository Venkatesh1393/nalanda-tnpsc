import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import {
  CURRENT_AFFAIRS_CATEGORIES,
  CURRENT_AFFAIRS_PERIODS,
} from '../constants/currentAffairs'

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export const listQuerySchema = z.object({
  period: z.enum(CURRENT_AFFAIRS_PERIODS),
  category: z.enum(CURRENT_AFFAIRS_CATEGORIES).optional(),
  month: z.string().regex(MONTH_PATTERN, 'month must be in YYYY-MM format').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type ListQuery = z.infer<typeof listQuerySchema>

export const idParamsSchema = z.object({
  id: z.string().min(1),
})
export type IdParams = z.infer<typeof idParamsSchema>

export const previewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
})
export type PreviewQuery = z.infer<typeof previewQuerySchema>

export const searchQuerySchema = z.object({
  q: z.string().min(1),
})
export type SearchQuery = z.infer<typeof searchQuerySchema>

export const archiveMonthParamsSchema = z.object({
  month: z.string().regex(MONTH_PATTERN, 'month must be in YYYY-MM format'),
})
export type ArchiveMonthParams = z.infer<typeof archiveMonthParamsSchema>

// --- Admin CRUD (Sprint 4 Step 54) -----------------------------------------

const objectIdSchema = z.string().refine(isValidObjectId, 'Invalid id')
const requiredBilingualSchema = z.object({
  en: z.string().trim().min(1, 'English text is required'),
  ta: z.string().trim().optional(),
})
const optionalBilingualSchema = z
  .object({ en: z.string().trim().optional(), ta: z.string().trim().optional() })
  .optional()
const bilingualParagraphsSchema = z
  .object({ en: z.array(z.string()).default([]), ta: z.array(z.string()).default([]) })
  .default({ en: [], ta: [] })

const quizOptionSchema = z.object({
  optionId: z.string().trim().min(1),
  text: requiredBilingualSchema,
})

/** The article's own self-contained comprehension quiz — distinct from
 * `quizQuestionIds` (real, linked `Question` documents) below. */
const quizQuestionSchema = z
  .object({
    questionId: z.string().trim().min(1),
    questionText: requiredBilingualSchema,
    options: z.array(quizOptionSchema).min(2).max(6),
    correctOptionId: z.string().trim().min(1),
    explanation: requiredBilingualSchema,
  })
  .refine(
    (data) => data.options.some((option) => option.optionId === data.correctOptionId),
    {
      message: 'correctOptionId must match one of the options',
      path: ['correctOptionId'],
    },
  )

const baseCurrentAffairFields = {
  date: z.coerce.date(),
  period: z.enum(CURRENT_AFFAIRS_PERIODS),
  category: z.enum(CURRENT_AFFAIRS_CATEGORIES),
  title: requiredBilingualSchema,
  excerpt: optionalBilingualSchema,
  body: bilingualParagraphsSchema,
  highlights: bilingualParagraphsSchema,
  examRelevanceTags: z.array(z.string().trim().min(1)).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
  isImportant: z.boolean().default(false),
  /** "Related questions" — real syllabus `Question` ids. Search/pick them
   * via the existing `GET /admin/questions?search=` endpoint (Step 53); no
   * separate "link questions" endpoint exists, editing this array through
   * the normal update call is the whole feature. */
  quizQuestionIds: z.array(objectIdSchema).default([]),
  quizQuestions: z.array(quizQuestionSchema).default([]),
  isActive: z.boolean().default(true),
  /** Step 54 "schedule/publish" — `undefined`/past = publish immediately
   * once `isActive: true`; a future date = scheduled. */
  publishAt: z.coerce.date().optional(),
}

export const createCurrentAffairBodySchema = z.object(baseCurrentAffairFields)
export type CreateCurrentAffairBody = z.infer<typeof createCurrentAffairBodySchema>

export const updateCurrentAffairBodySchema = z.object(baseCurrentAffairFields).partial()
export type UpdateCurrentAffairBody = z.infer<typeof updateCurrentAffairBodySchema>

export const updateCurrentAffairStatusBodySchema = z.object({ isActive: z.boolean() })
export type UpdateCurrentAffairStatusBody = z.infer<
  typeof updateCurrentAffairStatusBodySchema
>

export const adminIdParamsSchema = z.object({ id: objectIdSchema })
export type AdminIdParams = z.infer<typeof adminIdParamsSchema>

export const listAdminCurrentAffairsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  period: z.enum(CURRENT_AFFAIRS_PERIODS).optional(),
  category: z.enum(CURRENT_AFFAIRS_CATEGORIES).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListAdminCurrentAffairsQuery = z.infer<
  typeof listAdminCurrentAffairsQuerySchema
>
