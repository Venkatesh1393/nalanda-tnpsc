import type { Types } from 'mongoose'

import {
  AdaptivePracticeState,
  type AdaptivePracticeStateDocument,
} from '../models/AdaptivePracticeState.model'

export function findByUser(
  userId: Types.ObjectId | string,
): Promise<AdaptivePracticeStateDocument | null> {
  return AdaptivePracticeState.findOne({ userId })
}

/** Records `topicId` as the newest primary "practice next" pick shown to
 * this user, keeping at most `cap` entries (newest first) — just enough
 * history for the anti-repetition window without growing unbounded. */
export async function recordPrimaryPick(
  userId: Types.ObjectId | string,
  topicId: Types.ObjectId | string,
  cap: number,
): Promise<void> {
  const state = await AdaptivePracticeState.findOne({ userId })
  const entries = state?.recentPrimaryPicks ?? []
  const next = [{ topicId, recommendedAt: new Date() }, ...entries].slice(0, cap)
  await AdaptivePracticeState.findOneAndUpdate(
    { userId },
    { $set: { recentPrimaryPicks: next } },
    { upsert: true },
  )
}
