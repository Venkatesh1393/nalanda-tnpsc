import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

const NINETY_DAYS_IN_SECONDS = 90 * 24 * 60 * 60

/**
 * One row per (user, distinct query) — a repeat search bumps `count`/
 * `lastSearchedAt` via upsert instead of appending a new row every time
 * (`repositories/search.repository.ts`'s `touchHistory`), so "Recent
 * Searches" is already a de-duplicated, recency-ordered list with no
 * extra query-time grouping. The same `count` also backs the cross-user
 * "Popular Searches" aggregation.
 */
export interface ISearchHistory {
  userId: Types.ObjectId
  query: string
  count: number
  lastSearchedAt: Date
}

export type SearchHistoryDocument = HydratedDocument<ISearchHistory>

const searchHistorySchema = new Schema<ISearchHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  query: { type: String, required: true, trim: true },
  count: { type: Number, default: 1 },
  lastSearchedAt: { type: Date, default: Date.now },
})

searchHistorySchema.index({ userId: 1, query: 1 }, { unique: true })
searchHistorySchema.index({ userId: 1, lastSearchedAt: -1 })
// Backs `findPopular`'s cross-user aggregation (grouping by query text).
searchHistorySchema.index({ query: 1 })
// Same 90-day near-zero-value-after precedent as Notification.model.ts —
// keeps "Popular Searches" reflecting recent trends, not all-time noise.
searchHistorySchema.index(
  { lastSearchedAt: 1 },
  { expireAfterSeconds: NINETY_DAYS_IN_SECONDS },
)

export const SearchHistory = model<ISearchHistory>('SearchHistory', searchHistorySchema)
