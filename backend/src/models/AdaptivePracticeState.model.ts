import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

export interface IRecentRecommendation {
  topicId: Types.ObjectId
  recommendedAt: Date
}

const recentRecommendationSchema = new Schema<IRecentRecommendation>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    recommendedAt: { type: Date, required: true },
  },
  { _id: false },
)

/**
 * One tiny document per user — the only piece of the Adaptive Practice
 * Engine (Sprint 4 Step 60) that persists anything. Everything else the
 * engine reads is computed live from `QuestionAttempt` (same "live
 * aggregation, no materialized view" approach `analytics.service.ts` uses).
 * This document exists purely so "what to practice next" doesn't show the
 * identical topic on every call while nothing about the student's data has
 * changed — `recentPrimaryPicks` remembers the last handful of *primary*
 * recommendations shown, newest first, capped by the service layer (never
 * grows unbounded).
 */
export interface IAdaptivePracticeState {
  userId: Types.ObjectId
  recentPrimaryPicks: IRecentRecommendation[]
}

export type AdaptivePracticeStateDocument = HydratedDocument<IAdaptivePracticeState>

const adaptivePracticeStateSchema = new Schema<IAdaptivePracticeState>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    recentPrimaryPicks: { type: [recentRecommendationSchema], default: [] },
  },
  { timestamps: true },
)

export const AdaptivePracticeState = model<IAdaptivePracticeState>(
  'AdaptivePracticeState',
  adaptivePracticeStateSchema,
)
