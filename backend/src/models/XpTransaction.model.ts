import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

export const XP_TRANSACTION_REASONS = [
  'practice_completion',
  'lesson_completion',
  'live_exam_participation',
  'current_affairs_reading',
] as const
export type XpTransactionReason = (typeof XP_TRANSACTION_REASONS)[number]

/**
 * Sprint 4 Step 61 — Gamification System. An append-only audit ledger of
 * every XP/coin award — `Profile.xp`/`Profile.coins` hold the current
 * running total (what the UI reads, per `docs/Smart_Practice.md` §13's
 * "quiet, tabular update"), this collection is *why* that total is what it
 * is, mirroring the `AIHistory` audit-log-alongside-a-lighter-current-state
 * pattern Steps 57/58 already established. Also the real source for
 * "XP gained this week" (summed over a date range) without a separate
 * counter that would need its own weekly-reset job.
 */
export interface IXpTransaction {
  userId: Types.ObjectId
  xpAmount: number
  coinsAmount: number
  reason: XpTransactionReason
  /** The session/attempt/subtopic/article this award came from — no `ref`
   * enforced (polymorphic across four different source collections
   * depending on `reason`), same "unenforced ref, meaning depends on a
   * sibling field" pattern `Leaderboard.scopeRefId` already uses. */
  refId?: Types.ObjectId
  createdAt: Date
}

export type XpTransactionDocument = HydratedDocument<IXpTransaction>

const xpTransactionSchema = new Schema<IXpTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    xpAmount: { type: Number, required: true, min: 0 },
    coinsAmount: { type: Number, required: true, default: 0 },
    reason: { type: String, enum: XP_TRANSACTION_REASONS, required: true },
    refId: { type: Schema.Types.ObjectId },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

xpTransactionSchema.index({ userId: 1, createdAt: -1 })

export const XpTransaction = model<IXpTransaction>('XpTransaction', xpTransactionSchema)
