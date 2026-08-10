import { z } from 'zod'

import { EXAM_CATEGORY_CODES } from '../constants/exam'
import { SEARCH_CONTENT_TYPES } from '../constants/search'

/** `?types=subject&types=topic` arrives as an array once Express sees a
 * repeated key; a single `?types=subject` arrives as a bare string —
 * normalized to an array either way so callers never branch on shape. */
const typesFilter = z
  .union([z.array(z.enum(SEARCH_CONTENT_TYPES)), z.enum(SEARCH_CONTENT_TYPES)])
  .optional()
  .transform((value) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Search query must be at least 2 characters'),
  types: typesFilter,
  examCategory: z.enum(EXAM_CATEGORY_CODES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>

export const autocompleteQuerySchema = z.object({
  q: z.string().trim().min(1),
  types: typesFilter,
  examCategory: z.enum(EXAM_CATEGORY_CODES).optional(),
})
export type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>

export const searchHistoryQuerySchema = z.object({
  query: z.string().trim().min(1),
})
export type SearchHistoryQuery = z.infer<typeof searchHistoryQuerySchema>
