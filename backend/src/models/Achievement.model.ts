import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { BADGE_CODES, type BadgeCode } from '../constants/badges'

/**
 * No separate `Badge` catalog collection — deliberate simplification, see
 * `constants/badges.ts`'s header comment. `badgeCode` references that
 * code-level enum directly.
 */
export interface IAchievement {
  userId: Types.ObjectId
  badgeCode: BadgeCode
  examId?: Types.ObjectId
  earnedAt: Date
}

export type AchievementDocument = HydratedDocument<IAchievement>

const achievementSchema = new Schema<IAchievement>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    badgeCode: { type: String, enum: BADGE_CODES, required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam' },
    earnedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// Prevents duplicate badge awards (docs/Database.md §6).
achievementSchema.index({ userId: 1, badgeCode: 1 }, { unique: true })

export const Achievement = model<IAchievement>('Achievement', achievementSchema)
