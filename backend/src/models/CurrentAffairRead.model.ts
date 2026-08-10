import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

/**
 * Sprint 4 Step 61 — Gamification System. A small join collection recording
 * *that* (and when) a student has read a given Current Affairs article —
 * the real, persisted signal the "current affairs reading" XP action needs.
 * No such tracking existed before this step (the frontend's
 * `readProgressPercent` was an explicitly local-only, non-backend concept —
 * see `frontend/src/services/currentAffairsService.ts`). One document per
 * (user, article); the unique index both prevents a duplicate document and
 * is exactly the idempotency check that keeps XP from being re-awarded on a
 * second read of the same article, mirroring `Achievement`'s
 * `{userId, badgeCode}` duplicate-prevention pattern.
 */
export interface ICurrentAffairRead {
  userId: Types.ObjectId
  currentAffairId: Types.ObjectId
  readAt: Date
}

export type CurrentAffairReadDocument = HydratedDocument<ICurrentAffairRead>

const currentAffairReadSchema = new Schema<ICurrentAffairRead>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    currentAffairId: { type: Schema.Types.ObjectId, ref: 'CurrentAffair', required: true },
    readAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

currentAffairReadSchema.index({ userId: 1, currentAffairId: 1 }, { unique: true })

export const CurrentAffairRead = model<ICurrentAffairRead>(
  'CurrentAffairRead',
  currentAffairReadSchema,
)
