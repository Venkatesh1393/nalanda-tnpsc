import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { AdminRole } from '@/types/auth'

interface ApiEnvelope<T> {
  data: T
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number }
}

export interface DashboardStats {
  totalStudents: number
  activeStudents: number
  premiumStudents: number
  questions: number
  subjects: number
  topics: number
  lessons: number
  practiceSessions: number
  weeklyExams: number
  currentAffairs: number
  recentRegistrations: {
    id: string
    name: string
    email: string
    subscriptionTier: string
    createdAt: string | null
  }[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<ApiEnvelope<DashboardStats>>(
    endpoints.admin.dashboard,
  )
  return response.data.data
}

export type UserStatus = 'active' | 'suspended' | 'deleted'
export type SubscriptionTier = 'free' | 'plus' | 'pro' | 'institutional'

export interface AdminUserSummary {
  id: string
  name: string
  email: string
  role: AdminRole
  status: UserStatus
  subscriptionTier: SubscriptionTier
  createdAt: string | null
  lastLoginAt: string | null
}

export interface UserListFilter {
  search?: string
  role?: AdminRole
  status?: UserStatus
  subscriptionTier?: SubscriptionTier | 'premium'
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

export async function listUsers(
  filter: UserListFilter,
): Promise<PagedResult<AdminUserSummary>> {
  const response = await apiClient.get<ApiEnvelope<AdminUserSummary[]>>(
    endpoints.admin.users,
    {
      params: filter,
    },
  )
  return {
    items: response.data.data,
    page: response.data.meta?.page ?? 1,
    limit: response.data.meta?.limit ?? response.data.data.length,
    total: response.data.meta?.total ?? response.data.data.length,
    totalPages: response.data.meta?.totalPages ?? 1,
  }
}

export async function getUser(userId: string): Promise<AdminUserSummary> {
  const response = await apiClient.get<ApiEnvelope<AdminUserSummary>>(
    endpoints.admin.userDetail(userId),
  )
  return response.data.data
}

export async function updateUserStatus(
  userId: string,
  status: UserStatus,
): Promise<AdminUserSummary> {
  const response = await apiClient.patch<ApiEnvelope<AdminUserSummary>>(
    endpoints.admin.updateUserStatus(userId),
    { status },
  )
  return response.data.data
}

/** `super_admin` only — the backend independently enforces this
 * (`backend/src/routes/admin/users.routes.ts`); a non-super_admin caller
 * gets a real 403, not just a hidden button here. */
export async function updateUserRole(
  userId: string,
  role: AdminRole,
): Promise<AdminUserSummary> {
  const response = await apiClient.patch<ApiEnvelope<AdminUserSummary>>(
    endpoints.admin.updateUserRole(userId),
    { role },
  )
  return response.data.data
}

export type InviteStatus = 'pending' | 'consumed' | 'revoked'

export interface AdminInvite {
  id: string
  email: string
  role: AdminRole
  invitedByEmail: string
  status: InviteStatus
  createdAt: string | null
  consumedAt: string | null
  revokedAt: string | null
}

export type CreateInviteResult =
  | {
      outcome: 'role_applied_immediately'
      user: { id: string; email: string; role: AdminRole }
    }
  | { outcome: 'invite_created'; invite: AdminInvite }

/** "Register account for new admins" (Step 52 follow-up) — `super_admin`
 * only, independently enforced server-side. If the email already has an
 * account, its role is changed immediately; otherwise a pending invite is
 * created and applied automatically the moment that email first signs in. */
export async function createInvite(
  email: string,
  role: AdminRole,
): Promise<CreateInviteResult> {
  const response = await apiClient.post<ApiEnvelope<CreateInviteResult>>(
    endpoints.admin.invites,
    { email, role },
  )
  return response.data.data
}

export async function listInvites(status?: InviteStatus): Promise<AdminInvite[]> {
  const response = await apiClient.get<ApiEnvelope<AdminInvite[]>>(
    endpoints.admin.invites,
    {
      params: status ? { status } : undefined,
    },
  )
  return response.data.data
}

export async function revokeInvite(inviteId: string): Promise<AdminInvite> {
  const response = await apiClient.delete<ApiEnvelope<AdminInvite>>(
    endpoints.admin.revokeInvite(inviteId),
  )
  return response.data.data
}
