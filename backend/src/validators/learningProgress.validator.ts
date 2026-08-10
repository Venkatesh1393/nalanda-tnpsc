import { z } from 'zod'

import { PROGRESS_STATUSES } from '../models/LearningProgress.model'

/** Body shape for `PATCH /learning-progress/:subtopicSlug`. Every field is
 * optional and an empty body `{}` is valid — that's how
 * `recordSubtopicVisit` works: it just touches `lastAccessedAt` with no
 * other change (see `services/learningProgress.service.ts`). */
export const updateLearningProgressSchema = z.object({
  status: z.enum(PROGRESS_STATUSES).optional(),
  notesRead: z.boolean().optional(),
  lesson: z
    .object({
      /** Optional — the frontend never needs to know a raw Lesson
       * ObjectId (it only ever deals in subtopic slugs); when omitted,
       * the service resolves the subtopic's primary video lesson itself,
       * same as `bookmark.service.ts`'s content resolution. Kept optional
       * (not removed) so a future multi-lesson subtopic can still target
       * a specific one. */
      lessonId: z.string().min(1).optional(),
      progressPercent: z.number().min(0).max(100),
    })
    .optional(),
})

export type UpdateLearningProgressBody = z.infer<typeof updateLearningProgressSchema>
