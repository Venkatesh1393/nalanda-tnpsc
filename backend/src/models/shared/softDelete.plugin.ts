import type { Schema } from 'mongoose'

/**
 * Applied to content models that are referenced by historical records
 * (Question by QuestionAttempt, Subject/Topic/Subtopic/Lesson/StudyMaterial
 * by LearningProgress, CurrentAffair by Bookmark) — retracting a piece of
 * content must never break a past attempt/bookmark's ability to resolve its
 * reference, so content is marked deleted, not removed.
 *
 * Deliberately does *not* install a global query middleware that silently
 * excludes soft-deleted documents — that kind of implicit filtering is easy
 * to forget about (or fight against) in code that legitimately needs
 * deleted records (an admin "trash" view, a repair script). Callers filter
 * on `deletedAt: null` explicitly; `notDeletedFilter()` is a small helper
 * for that, not a hook.
 */
export interface SoftDeletable {
  deletedAt: Date | null
}

export function softDeletePlugin(schema: Schema): void {
  schema.add({
    deletedAt: { type: Date, default: null, index: true },
  })
}

export const notDeletedFilter = { deletedAt: null } as const
