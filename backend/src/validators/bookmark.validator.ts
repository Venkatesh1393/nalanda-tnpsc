import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

/** Learn content (Step 45) plus Practice question bookmarks (Step 46) plus
 * Current Affairs bookmarks (Step: Current Affairs backend) — a
 * discriminated union since `question`/`current_affairs` bookmarks
 * reference a real Mongo `_id` directly (neither has a slug of its own),
 * while `lesson`/`study_material` still resolve via a subtopic slug (Step
 * 45's existing, unchanged contract). */
export const createBookmarkSchema = z.discriminatedUnion('contentType', [
  z.object({
    contentType: z.enum(['lesson', 'study_material']),
    subtopicSlug: z.string().min(1, 'subtopicSlug is required'),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    contentType: z.literal('question'),
    questionId: z.string().refine(isValidObjectId, 'Invalid questionId'),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    contentType: z.literal('current_affairs'),
    currentAffairId: z.string().refine(isValidObjectId, 'Invalid currentAffairId'),
    note: z.string().trim().max(500).optional(),
  }),
])

export type CreateBookmarkBody = z.infer<typeof createBookmarkSchema>
