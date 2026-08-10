import type { Types } from 'mongoose'

import {
  CurrentAffairRead,
  type CurrentAffairReadDocument,
} from '../models/CurrentAffairRead.model'

/** Idempotent by design — same duplicate-key-swallow pattern as
 * `achievementRepository.awardIfNew`, backed by the model's
 * `{userId, currentAffairId}` unique index. Returns `null` when this
 * article was already marked read by this user (the caller's signal not to
 * award XP again), the created document otherwise. */
export async function recordIfNew(
  userId: Types.ObjectId | string,
  currentAffairId: Types.ObjectId | string,
): Promise<CurrentAffairReadDocument | null> {
  try {
    return await CurrentAffairRead.create({ userId, currentAffairId })
  } catch (error) {
    const mongoError = error as { code?: number }
    if (mongoError.code === 11000) return null
    throw error
  }
}
