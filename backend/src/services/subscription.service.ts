import type { BillingCycle, SubscriptionStatus } from '../constants/commerce'
import type { FeatureKey } from '../constants/entitlements'
import type { SubscriptionTier } from '../constants/roles'
import type { SubscriptionDocument, SubscriptionProvider } from '../models/Subscription.model'
import type { UserDocument } from '../models/User.model'
import * as subscriptionRepository from '../repositories/subscription.repository'
import * as userRepository from '../repositories/user.repository'
import { ApiError } from '../utils/ApiError'
import { getEntitlements, listPlans } from './entitlement.service'
import { notifyUserIfEnabled } from './notification.service'

/**
 * The Payments module's read surface (Sprint 4 Step 55) — plan catalog +
 * "what is my subscription state right now." Deliberately does NOT include
 * order creation, checkout, or webhook handling — this step explicitly
 * excludes Razorpay integration, so nothing here can activate or change a
 * subscription. A `Subscription` document only exists once a real
 * activation flow is built; until then every user's state is synthesized
 * from `User.subscriptionTier` (see `buildSubscriptionState` below), never
 * a placeholder document created just to have one.
 */

export interface PlanDTO {
  tier: SubscriptionTier
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  isCustomPricing: boolean
  highlights: string[]
  features: FeatureKey[]
}

export function getPlanCatalog(): PlanDTO[] {
  return listPlans().map((plan) => ({
    tier: plan.tier,
    name: plan.name,
    description: plan.description,
    monthlyPrice: plan.monthlyPrice,
    annualPrice: plan.annualPrice,
    isCustomPricing: plan.isCustomPricing,
    highlights: plan.highlights,
    features: plan.features,
  }))
}

export interface SubscriptionStateDTO {
  userId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  billingCycle: BillingCycle | null
  provider: SubscriptionProvider | null
  providerSubscriptionId: string | null
  providerCustomerId: string | null
  startDate: string | null
  endDate: string | null
  autoRenew: boolean
  entitlements: Record<FeatureKey, boolean>
}

/**
 * Shared by the self-service `GET /payments/subscription` endpoint and the
 * admin inspection endpoints — one place decides how a `Subscription`
 * document (or its absence) becomes the state a caller sees, so the two
 * surfaces can never drift. A `free` user with no `Subscription` document
 * (the common case — nothing creates one until a real activation flow
 * exists) reads as `status: 'inactive'`, never a fabricated `'active'`.
 */
export function buildSubscriptionState(
  user: Pick<UserDocument, 'id' | 'subscriptionTier'>,
  subscription: SubscriptionDocument | null,
): SubscriptionStateDTO {
  return {
    userId: user.id,
    tier: user.subscriptionTier,
    status:
      subscription?.status ?? (user.subscriptionTier === 'free' ? 'inactive' : 'active'),
    billingCycle: subscription?.billingCycle ?? null,
    provider: subscription?.provider ?? null,
    providerSubscriptionId: subscription?.razorpaySubscriptionId ?? null,
    providerCustomerId: subscription?.providerCustomerId ?? null,
    startDate: subscription?.startDate?.toISOString() ?? null,
    endDate: subscription?.currentPeriodEnd?.toISOString() ?? null,
    autoRenew: subscription?.autoRenew ?? false,
    entitlements: getEntitlements(user.subscriptionTier),
  }
}

/**
 * No background job/cron exists anywhere in this codebase yet (same
 * documented gap as Analytics/Leaderboard's live-aggregation approach) — a
 * lapsed subscription is caught lazily, right here, the moment anyone next
 * reads it, rather than left showing a stale `active`/`cancelled` status
 * forever. Downgrades both the `Subscription` document and the denormalized
 * `User.subscriptionTier` in the same pass so entitlements reflect reality
 * on this and every subsequent read (Sprint 4 Step 56).
 */
async function applyLazyExpiry(
  user: UserDocument,
  subscription: SubscriptionDocument | null,
): Promise<SubscriptionDocument | null> {
  if (!subscription?.currentPeriodEnd) return subscription
  const isExpirable = subscription.status === 'active' || subscription.status === 'cancelled'
  const isPastEnd = subscription.currentPeriodEnd.getTime() < Date.now()
  if (!isExpirable || !isPastEnd) return subscription

  const expiredTier = user.subscriptionTier
  subscription.status = 'expired'
  await subscription.save()

  if (user.subscriptionTier !== 'free') {
    await userRepository.updateSubscriptionTier(user.id, 'free')
    user.subscriptionTier = 'free'
  }

  // Sprint 4 Step 62 — the real, immediate "just expired" notice, fired
  // exactly once per genuine active/cancelled → expired transition (never
  // on a later read of an already-expired subscription, since this
  // function already early-returns before reaching here in that case).
  await notifyUserIfEnabled(user.id, {
    category: 'premium-update',
    title: { en: 'Your subscription has expired' },
    body: {
      en: `Your ${expiredTier} plan has expired and your account is now on the Free plan. Renew anytime to restore premium features.`,
    },
    deepLink: '/app/settings/subscription',
    actionLabel: { en: 'Renew Subscription' },
  })

  return subscription
}

export async function getMySubscription(userId: string): Promise<SubscriptionStateDTO> {
  const user = await userRepository.findById(userId)
  if (!user) throw ApiError.notFound('User not found')
  const subscription = await applyLazyExpiry(user, await subscriptionRepository.findByUserId(userId))
  return buildSubscriptionState(user, subscription)
}
