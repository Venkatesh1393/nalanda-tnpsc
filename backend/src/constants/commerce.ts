/**
 * `docs/Database.md` §4.6's `Subscriptions`/`Payments` enums. `'inactive'`
 * added for Sprint 4 Step 55 (Entitlement Engine) — the state of a `free`
 * tier user who has never subscribed, distinct from `cancelled`/`expired`
 * (which imply a subscription existed and ended).
 */
export const SUBSCRIPTION_STATUSES = [
  'inactive',
  'active',
  'past_due',
  'cancelled',
  'expired',
] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const PAYMENT_STATUSES = ['created', 'captured', 'failed', 'refunded'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

/** A plan's billing cadence — `undefined` on the `Subscription` document
 * itself for the `free` tier, which has no billing cycle at all. */
export const BILLING_CYCLES = ['monthly', 'annual'] as const
export type BillingCycle = (typeof BILLING_CYCLES)[number]
