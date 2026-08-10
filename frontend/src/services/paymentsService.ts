import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { PricingPlan } from '@/types/marketing'
import type {
  BillingCycle,
  CancelSubscriptionResult,
  CheckoutTier,
  CreateOrderResult,
  FeatureKey,
  MySubscription,
  PaymentHistoryItem,
  VerifyPaymentInput,
} from '@/types/payments'

/**
 * Domain calls for the Payments backend module (docs/API.md §8,
 * `backend/src/routes/payments.routes.ts`). Sprint 4 Step 55 replaced the
 * mock plan catalog (`services/mock/paymentsMockService.ts`) with the real,
 * unauthenticated `GET /payments/plans`. Sprint 4 Step 56 added the
 * Razorpay checkout flow below — order creation and payment-signature
 * verification only; actual activation happens server-side via webhook
 * (`backend/src/services/payment.service.ts`'s header comment), never
 * because this file said so.
 */

interface ApiEnvelope<T> {
  data: T
}

interface PlanApiResponse {
  tier: PricingPlan['tier']
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  isCustomPricing: boolean
  highlights: string[]
  features: FeatureKey[]
}

export async function getPricingPlans(): Promise<PricingPlan[]> {
  const response = await apiClient.get<ApiEnvelope<PlanApiResponse[]>>(
    endpoints.payments.plans,
  )
  return response.data.data.map((plan) => ({
    tier: plan.tier,
    monthlyPrice: plan.monthlyPrice,
    annualPrice: plan.annualPrice,
    features: plan.highlights,
  }))
}

/** Authenticated — the signed-in user's own subscription state, computed
 * server-side by the entitlement engine. Used by `pages/payments/
 * subscription-page.tsx` and anywhere else that needs the full entitlement
 * map rather than just the `subscriptionTier` string already on
 * `DashboardSummary`. */
export async function getMySubscription(): Promise<MySubscription> {
  const response = await apiClient.get<ApiEnvelope<MySubscription>>(
    endpoints.payments.subscription,
  )
  return response.data.data
}

export async function createOrder(
  tier: CheckoutTier,
  billingCycle: BillingCycle,
): Promise<CreateOrderResult> {
  const response = await apiClient.post<ApiEnvelope<CreateOrderResult>>(
    endpoints.payments.createOrder,
    { tier, billingCycle },
  )
  return response.data.data
}

/** Signature check only — never trust this call's success alone as "the
 * plan is active." The real activation is webhook-driven and may land a
 * few seconds after this resolves; callers should refetch
 * `getMySubscription()` rather than optimistically flipping local state. */
export async function verifyPayment(
  input: VerifyPaymentInput,
): Promise<{ status: 'processing' }> {
  const response = await apiClient.post<ApiEnvelope<{ status: 'processing' }>>(
    endpoints.payments.verify,
    input,
  )
  return response.data.data
}

export async function cancelSubscription(
  reason?: string,
): Promise<CancelSubscriptionResult> {
  const response = await apiClient.post<ApiEnvelope<CancelSubscriptionResult>>(
    endpoints.payments.cancelSubscription,
    { reason },
  )
  return response.data.data
}

export interface PaymentHistoryPage {
  items: PaymentHistoryItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export async function getPaymentHistory(
  page = 1,
  limit = 20,
): Promise<PaymentHistoryPage> {
  const response = await apiClient.get<{
    data: PaymentHistoryItem[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }>(endpoints.payments.invoices, { params: { page, limit } })
  return {
    items: response.data.data,
    page: response.data.meta.page,
    limit: response.data.meta.limit,
    total: response.data.meta.total,
    totalPages: response.data.meta.totalPages,
  }
}
