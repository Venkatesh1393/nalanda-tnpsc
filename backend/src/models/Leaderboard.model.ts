import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { LEADERBOARD_SCOPES, type LeaderboardScope } from '../constants/leaderboard'

export interface ILeaderboardEntry {
  userId: Types.ObjectId
  score: number
  rank: number
}

const leaderboardEntrySchema = new Schema<ILeaderboardEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true },
    rank: { type: Number, required: true },
  },
  { _id: false },
)

const MAX_LEADERBOARD_ENTRIES = 100

/**
 * Materialized, bounded — `entries` is capped at top 100 (docs/Database.md
 * §4.4/§8.3); a user outside the top 100 is computed on-demand from
 * `StudentAnalytics`, never stored here. `scopeRefId` is polymorphic (no
 * `ref`) — its target collection depends on `scope` (e.g. a future LiveExam
 * id when `scope: 'liveExam'`, unused until that collection exists).
 */
export interface ILeaderboard {
  scope: LeaderboardScope
  scopeRefId?: Types.ObjectId
  periodStart: Date
  periodEnd: Date
  entries: ILeaderboardEntry[]
}

export type LeaderboardDocument = HydratedDocument<ILeaderboard>

const leaderboardSchema = new Schema<ILeaderboard>(
  {
    scope: { type: String, enum: LEADERBOARD_SCOPES, required: true },
    scopeRefId: {
      type: Schema.Types.ObjectId,
      validate: {
        validator(this: ILeaderboard, value: Types.ObjectId | undefined) {
          return this.scope === 'global' || value !== undefined
        },
        message: 'scopeRefId is required unless scope is "global".',
      },
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    entries: {
      type: [leaderboardEntrySchema],
      default: [],
      validate: {
        validator: (entries: ILeaderboardEntry[]) =>
          entries.length <= MAX_LEADERBOARD_ENTRIES,
        message: `entries cannot exceed ${MAX_LEADERBOARD_ENTRIES} (top-100 only, by design).`,
      },
    },
  },
  { timestamps: true },
)

leaderboardSchema.index({ scope: 1, scopeRefId: 1, periodStart: 1 }, { unique: true })

export const Leaderboard = model<ILeaderboard>('Leaderboard', leaderboardSchema)
