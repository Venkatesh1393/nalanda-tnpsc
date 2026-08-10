import type { Types } from 'mongoose'

import type { BadgeCode } from '../constants/badges'
import { Achievement, type AchievementDocument } from '../models/Achievement.model'

export function findByUser(userId: Types.ObjectId | string): Promise<AchievementDocument[]> {
  return Achievement.find({ userId }).sort({ earnedAt: -1 })
}

export async function findEarnedCodes(
  userId: Types.ObjectId | string,
): Promise<Set<BadgeCode>> {
  const docs = await Achievement.find({ userId }).select('badgeCode')
  return new Set(docs.map((doc) => doc.badgeCode))
}

/** Idempotent by design — `Achievement`'s `{userId, badgeCode}` unique index
 * (`models/Achievement.model.ts`) is the real guarantee against a duplicate
 * award; a duplicate-key error here is swallowed as "already earned,"
 * exactly like `bookmarkRepository`'s equivalent toggle-safety pattern,
 * since a concurrent second award attempt racing the same first-time
 * transition is a real possibility this needs to survive cleanly. */
export async function awardIfNew(
  userId: Types.ObjectId | string,
  badgeCode: BadgeCode,
  examId?: Types.ObjectId | string,
): Promise<AchievementDocument | null> {
  try {
    return await Achievement.create({ userId, badgeCode, examId })
  } catch (error) {
    const mongoError = error as { code?: number }
    if (mongoError.code === 11000) return null
    throw error
  }
}
