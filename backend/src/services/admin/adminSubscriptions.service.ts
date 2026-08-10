import type { SubscriptionTier } from '../../constants/roles'
import * as profileRepository from '../../repositories/profile.repository'
import * as subscriptionRepository from '../../repositories/subscription.repository'
import * as userRepository from '../../repositories/user.repository'
import type { AdminUserListFilter } from '../../repositories/user.repository'
import { ApiError } from '../../utils/ApiError'
import {
  buildSubscriptionState,
  type SubscriptionStateDTO,
} from '../subscription.service'

/**
 * Read-only subscription inspection for admin staff (Sprint 4 Step 55).
 * Deliberately has no `update`/`grant`/`refund` function anywhere in this
 * file — that's this step's explicit "do not allow unsafe manual payment
 * manipulation" boundary; the only way a subscription's state changes is
 * the (not-yet-built) Razorpay-verified activation flow.
 */

export interface AdminSubscriptionSummaryDTO extends SubscriptionStateDTO {
  email: string
  name: string
}

export async function listSubscriptions(
  filter: { tier?: SubscriptionTier | 'premium' },
  page: number,
  limit: number,
): Promise<{ items: AdminSubscriptionSummaryDTO[]; total: number; page: number; limit: number }> {
  const userFilter: AdminUserListFilter = { subscriptionTier: filter.tier }
  const { items: users, total } = await userRepository.listForAdmin(userFilter, page, limit)

  const [subscriptions, profiles] = await Promise.all([
    subscriptionRepository.findManyByUserIds(users.map((user) => user.id)),
    profileRepository.findByUserIds(users.map((user) => user.id)),
  ])
  const subscriptionByUserId = new Map(
    subscriptions.map((subscription) => [subscription.userId.toString(), subscription]),
  )
  const nameByUserId = new Map(
    profiles.map((profile) => [profile.userId.toString(), profile.name]),
  )

  return {
    items: users.map((user) => ({
      ...buildSubscriptionState(user, subscriptionByUserId.get(user.id) ?? null),
      email: user.email,
      name: nameByUserId.get(user.id) ?? user.email,
    })),
    total,
    page,
    limit,
  }
}

export async function getSubscriptionForUser(
  userId: string,
): Promise<AdminSubscriptionSummaryDTO> {
  const user = await userRepository.findById(userId)
  if (!user) throw ApiError.notFound('User not found')
  const [subscription, profile] = await Promise.all([
    subscriptionRepository.findByUserId(userId),
    profileRepository.findByUserId(userId),
  ])
  return {
    ...buildSubscriptionState(user, subscription),
    email: user.email,
    name: profile?.name ?? user.email,
  }
}
