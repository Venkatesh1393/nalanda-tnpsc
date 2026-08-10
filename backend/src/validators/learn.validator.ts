import { z } from 'zod'

import { EXAM_CATEGORY_CODES } from '../constants/exam'

/** Query shape for `GET /subjects` — `examCategory` stays optional (rather
 * than docs/API.md §3's "required") since a caller with no active exam
 * goal yet (e.g. mid-Onboarding) can still legitimately want the full
 * active-subject catalog. */
export const subjectsQuerySchema = z.object({
  examCategory: z.enum(EXAM_CATEGORY_CODES).optional(),
})
export type SubjectsQuery = z.infer<typeof subjectsQuerySchema>

export const learnSearchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Search query must be at least 2 characters'),
  examCategory: z.enum(EXAM_CATEGORY_CODES).optional(),
})
export type LearnSearchQuery = z.infer<typeof learnSearchQuerySchema>
