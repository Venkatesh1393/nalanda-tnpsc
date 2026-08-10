import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { SubscriptionTier } from './adminService'

interface ApiEnvelope<T> {
  data: T
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number }
}

export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'cancelled' | 'expired'

export const FEATURE_KEYS = [
  'ai_explanations',
  'ai_tutor',
  'premium_practice',
  'advanced_analytics',
  'premium_study_material',
  'additional_mock_exams',
] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]

/**
 * Mirrors the backend's `SubscriptionStateDTO`
 * (`backend/src/services/subscription.service.ts`) — read-only, Sprint 4
 * Step 55. `entitlements` is the same engine output the student-facing app
 * uses for presentation; here it's shown to the admin for inspection, never
 * edited from this app.
 */
export interface AdminSubscriptionSummary {
  userId: string
  email: string
  name: string
  tier: SubscriptionTier
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

export interface SubscriptionListFilter {
  tier?: SubscriptionTier | 'premium'
  page?: number
  limit?: number
}

export interface PagedResult<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export async function listSubscriptions(
  filter: SubscriptionListFilter,
): Promise<PagedResult<AdminSubscriptionSummary>> {
  const response = await apiClient.get<ApiEnvelope<AdminSubscriptionSummary[]>>(
    endpoints.admin.subscriptions,
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

export async function getSubscription(userId: string): Promise<AdminSubscriptionSummary> {
  const response = await apiClient.get<ApiEnvelope<AdminSubscriptionSummary>>(
    endpoints.admin.subscriptionDetail(userId),
  )
  return response.data.data
}
