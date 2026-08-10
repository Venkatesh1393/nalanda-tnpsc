/**
 * Sprint 4 Step 55 — Premium Plans + Entitlement Engine. Mirrors the
 * backend's `SubscriptionStateDTO` (`backend/src/services/subscription.
 * service.ts`) exactly. The frontend only ever reads `entitlements` for
 * presentation (locking a card, showing a CTA) — the backend is
 * authoritative for every one of these booleans.
 */

export const FEATURE_KEYS = [
  'ai_explanations',
  'ai_tutor',
  'premium_practice',
  'advanced_analytics',
  'premium_study_material',
  'additional_mock_exams',
] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]

export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'cancelled' | 'expired'

export type MySubscription = {
  userId: string
  tier: 'free' | 'plus' | 'pro' | 'institutional'
  status: SubscriptionStatus
  billingCycle: 'monthly' | 'annual' | null
  provider: string | null
  providerSubscriptionId: string | null
  providerCustomerId: string | null
  startDate: string | null
  endDate: string | null
  autoRenew: boolean
  entitlements: Record<FeatureKey, boolean>
}

/** Sprint 4 Step 56 — Razorpay Payment + Subscription Integration. */

export type CheckoutTier = 'plus' | 'pro'
export type BillingCycle = 'monthly' | 'annual'

export type CreateOrderResult = {
  razorpayOrderId: string
  amount: number
  currency: string
  razorpayKeyId: string
}

export type VerifyPaymentInput = {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

export type CancelSubscriptionResult = {
  status: 'cancelled'
  accessUntil: string | null
}

export type PaymentStatus = 'created' | 'captured' | 'failed' | 'refunded'

export type PaymentHistoryItem = {
  id: string
  tier: 'free' | 'plus' | 'pro' | 'institutional'
  billingCycle: BillingCycle
  amount: number
  currency: string
  status: PaymentStatus
  failureReason: string | null
  invoiceUrl: string | null
  createdAt: string | null
}
