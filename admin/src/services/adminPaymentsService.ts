import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { SubscriptionTier } from './adminService'
import type { PagedResult } from './adminSubscriptionsService'

interface ApiEnvelope<T> {
  data: T
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number }
}

export type PaymentStatus = 'created' | 'captured' | 'failed' | 'refunded'
export type BillingCycle = 'monthly' | 'annual'

/** Mirrors the backend's `AdminPaymentSummaryDTO`
 * (`backend/src/services/admin/adminPayments.service.ts`) — read-only,
 * Sprint 4 Step 56. No refund/status-edit field exists anywhere in this
 * app; a refund is a real Razorpay-side action, never a form here. */
export interface AdminPaymentSummary {
  id: string
  userId: string
  email: string
  name: string
  tier: SubscriptionTier
  billingCycle: BillingCycle
  amount: number
  currency: string
  status: PaymentStatus
  failureReason: string | null
  invoiceUrl: string | null
  createdAt: string | null
}

export interface PaymentListFilter {
  userId?: string
  status?: PaymentStatus
  page?: number
  limit?: number
}

export async function listPayments(
  filter: PaymentListFilter,
): Promise<PagedResult<AdminPaymentSummary>> {
  const response = await apiClient.get<ApiEnvelope<AdminPaymentSummary[]>>(
    endpoints.admin.payments,
    { params: filter },
  )
  return {
    items: response.data.data,
    page: response.data.meta?.page ?? 1,
    limit: response.data.meta?.limit ?? response.data.data.length,
    total: response.data.meta?.total ?? response.data.data.length,
    totalPages: response.data.meta?.totalPages ?? 1,
  }
}

export async function getPayment(paymentId: string): Promise<AdminPaymentSummary> {
  const response = await apiClient.get<ApiEnvelope<AdminPaymentSummary>>(
    endpoints.admin.paymentDetail(paymentId),
  )
  return response.data.data
}
