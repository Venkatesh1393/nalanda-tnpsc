import { PLAN_CATALOG, type PlanDefinition } from '../config/plans.config'
import { FEATURE_KEYS, type FeatureKey } from '../constants/entitlements'
import type { SubscriptionTier } from '../constants/roles'

/**
 * The centralized entitlement engine (Sprint 4 Step 55) — the single place
 * that answers "does this tier unlock this feature." Every service/
 * middleware that used to inline a check like `subscriptionTier !== 'free'`
 * (practice.service.ts, liveExam.service.ts) or skip the check entirely
 * (learn.service.ts's `isPremium` passthrough bug) should call `hasFeature`/
 * `getEntitlements` here instead — never re-derive premium-ness from
 * `subscriptionTier` at the call site. The backend is authoritative: the
 * frontend only ever reads the resulting booleans for presentation (locking
 * a card, showing a CTA), never decides them itself.
 */

const planByTier = new Map<SubscriptionTier, PlanDefinition>(
  PLAN_CATALOG.map((plan) => [plan.tier, plan]),
)

export function getPlan(tier: SubscriptionTier): PlanDefinition {
  const plan = planByTier.get(tier)
  if (!plan) throw new Error(`No plan configured for subscription tier "${tier}"`)
  return plan
}

export function listPlans(): readonly PlanDefinition[] {
  return PLAN_CATALOG
}

export function hasFeature(tier: SubscriptionTier, feature: FeatureKey): boolean {
  return getPlan(tier).features.includes(feature)
}

export function getEntitlements(tier: SubscriptionTier): Record<FeatureKey, boolean> {
  const plan = getPlan(tier)
  return Object.fromEntries(
    FEATURE_KEYS.map((feature) => [feature, plan.features.includes(feature)]),
  ) as Record<FeatureKey, boolean>
}
