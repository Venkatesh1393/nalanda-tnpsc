import type { Types } from 'mongoose'

import type { AiFeature } from '../constants/ai'
import {
  AIHistory,
  type AIHistoryDocument,
  type IAIHistory,
} from '../models/AIHistory.model'

/** Sprint 4 Step 58 — Admin AI Usage dashboard aggregates. Every function
 * below reads from `AIHistory` only (counts, tokens, cost) — never from
 * `AIExplanation` (the actual generated explanation text), so admin
 * visibility can never leak generated content, only usage metadata. */
export interface AiUsageSummary {
  total: number
  successful: number
  failed: number
  cached: number
  generated: number
  estimatedCostUsd: number
  /** Sprint 4 Step 74 — average provider call latency across rows that
   * actually attempted one (`latencyMs` set) — `null` when none did (e.g.
   * every row in the window was quota-exceeded/not-configured, or a window
   * with zero generated rows), never a misleading `0`. */
  avgLatencyMs: number | null
}

const ZERO_SUMMARY: AiUsageSummary = {
  total: 0,
  successful: 0,
  failed: 0,
  cached: 0,
  generated: 0,
  estimatedCostUsd: 0,
  avgLatencyMs: null,
}

function usageCountersStage(): Record<string, unknown> {
  return {
    total: { $sum: 1 },
    successful: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
    failed: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
    cached: { $sum: { $cond: [{ $eq: ['$source', 'cached'] }, 1, 0] } },
    generated: { $sum: { $cond: [{ $eq: ['$source', 'generated'] }, 1, 0] } },
    estimatedCostUsd: { $sum: { $ifNull: ['$estimatedCostUsd', 0] } },
    avgLatencyMs: { $avg: '$latencyMs' }, // Mongo's $avg already ignores missing/null fields
  }
}

export async function getUsageSummary(
  since: Date,
  feature?: AiFeature,
): Promise<AiUsageSummary> {
  const match: Record<string, unknown> = { createdAt: { $gte: since } }
  if (feature) match.feature = feature
  const [row] = await AIHistory.aggregate<AiUsageSummary>([
    { $match: match },
    { $group: { _id: null, ...usageCountersStage() } },
    { $project: { _id: 0 } },
  ])
  return row ?? ZERO_SUMMARY
}

export interface AiUsageByUserRow extends AiUsageSummary {
  userId: string
}

export async function getUsageByUser(
  since: Date,
  limit: number,
  feature?: AiFeature,
): Promise<AiUsageByUserRow[]> {
  const match: Record<string, unknown> = { createdAt: { $gte: since } }
  if (feature) match.feature = feature
  const rows = await AIHistory.aggregate<AiUsageSummary & { _id: Types.ObjectId }>([
    { $match: match },
    { $group: { _id: '$userId', ...usageCountersStage() } },
    { $sort: { total: -1 } },
    { $limit: limit },
  ])
  return rows.map(({ _id, ...rest }) => ({ userId: _id.toString(), ...rest }))
}

export interface AiUsageByQuestionRow extends AiUsageSummary {
  questionId: string
}

/** Question-scoped by construction — only `question_explanation` rows ever
 * carry a `questionId`, so no explicit `feature` filter is needed. */
export async function getUsageByQuestion(
  since: Date,
  limit: number,
): Promise<AiUsageByQuestionRow[]> {
  const rows = await AIHistory.aggregate<AiUsageSummary & { _id: Types.ObjectId }>([
    { $match: { createdAt: { $gte: since }, questionId: { $exists: true } } },
    { $group: { _id: '$questionId', ...usageCountersStage() } },
    { $sort: { total: -1 } },
    { $limit: limit },
  ])
  return rows.map(({ _id, ...rest }) => ({ questionId: _id.toString(), ...rest }))
}

export function create(
  data: Omit<IAIHistory, 'userId' | 'userFeedback' | 'createdAt'> & {
    userId: Types.ObjectId | string
  },
): Promise<AIHistoryDocument> {
  return AIHistory.create(data)
}

/** Per-user daily quota check — counts only `source: 'generated'` rows
 * (real provider calls) for today, in the caller's local server timezone-
 * agnostic UTC calendar day. Cache hits never count against this, per
 * `AIExplanation.model.ts`'s "reuse costs nothing" design. */
export function countGeneratedToday(
  userId: Types.ObjectId | string,
  feature: AiFeature,
): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  return AIHistory.countDocuments({
    userId,
    feature,
    source: 'generated',
    createdAt: { $gte: startOfDay },
  })
}
