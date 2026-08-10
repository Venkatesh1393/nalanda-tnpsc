import type { SubscriptionTier } from '../constants/roles'
import type { SubscriptionStatus } from '../constants/commerce'
import { Subscription, type SubscriptionDocument } from '../models/Subscription.model'

export function findByUserId(userId: string): Promise<SubscriptionDocument | null> {
  return Subscription.findOne({ userId })
}

export type AdminSubscriptionListFilter = {
  tier?: SubscriptionTier
  status?: SubscriptionStatus
}

function buildQuery(filter: AdminSubscriptionListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (filter.tier) query.tier = filter.tier
  if (filter.status) query.status = filter.status
  return query
}

export async function listForAdmin(
  filter: AdminSubscriptionListFilter,
  page: number,
  limit: number,
): Promise<{ items: SubscriptionDocument[]; total: number }> {
  const query = buildQuery(filter)
  const [items, total] = await Promise.all([
    Subscription.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Subscription.countDocuments(query),
  ])
  return { items, total }
}

export function findManyByUserIds(userIds: string[]): Promise<SubscriptionDocument[]> {
  return Subscription.find({ userId: { $in: userIds } })
}

/** The real signal behind the Subscription Expiry reminder (Sprint 4 Step
 * 62) — active subscriptions whose `currentPeriodEnd` falls inside
 * `[from, to)`, i.e. "about to lapse," distinct from the already-real lazy
 * downgrade in `subscription.service.ts#applyLazyExpiry` (which only fires
 * *after* expiry, on next read). */
export function findExpiringBetween(
  from: Date,
  to: Date,
): Promise<SubscriptionDocument[]> {
  return Subscription.find({
    status: 'active',
    currentPeriodEnd: { $gte: from, $lt: to },
  })
}
