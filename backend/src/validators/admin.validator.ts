import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import { PAYMENT_STATUSES } from '../constants/commerce'
import { ADMIN_ACCESS_ROLES, ROLES, SUBSCRIPTION_TIERS } from '../constants/roles'
import { USER_STATUSES } from '../constants/user'

export const listUsersQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  subscriptionTier: z.enum([...SUBSCRIPTION_TIERS, 'premium']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>

export const userIdParamsSchema = z.object({
  userId: z.string().refine(isValidObjectId, 'Invalid userId'),
})
export type UserIdParams = z.infer<typeof userIdParamsSchema>

export const updateUserStatusBodySchema = z.object({
  status: z.enum(USER_STATUSES),
})
export type UpdateUserStatusBody = z.infer<typeof updateUserStatusBodySchema>

export const updateUserRoleBodySchema = z.object({
  role: z.enum(ROLES),
})
export type UpdateUserRoleBody = z.infer<typeof updateUserRoleBodySchema>

export const auditLogQuerySchema = z.object({
  entityType: z.string().trim().min(1).max(100).optional(),
  actorId: z.string().refine(isValidObjectId, 'Invalid actorId').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>

export const createInviteBodySchema = z.object({
  email: z.string().trim().email(),
  // Deliberately excludes 'user' — see AdminInvite.model.ts's header comment.
  role: z.enum(ADMIN_ACCESS_ROLES),
})
export type CreateInviteBody = z.infer<typeof createInviteBodySchema>

export const inviteIdParamsSchema = z.object({
  inviteId: z.string().refine(isValidObjectId, 'Invalid inviteId'),
})
export type InviteIdParams = z.infer<typeof inviteIdParamsSchema>

export const listInvitesQuerySchema = z.object({
  status: z.enum(['pending', 'consumed', 'revoked']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListInvitesQuery = z.infer<typeof listInvitesQuerySchema>

/**
 * Sprint 4 Step 55 — Admin Subscription inspection (read-only; no schema
 * anywhere in this file accepts a tier/status *write* — Step 55's explicit
 * "do not allow unsafe manual payment manipulation" boundary). Filtered by
 * `tier` only — the paginated source of truth is the `Users` collection
 * (every user has a tier; not every user has a `Subscription` document yet,
 * since nothing creates one until Razorpay activation exists), so a
 * `status` filter isn't offered here rather than implementing one that
 * silently drops every free/never-subscribed user from the page.
 */
export const listSubscriptionsQuerySchema = z.object({
  tier: z.enum([...SUBSCRIPTION_TIERS, 'premium']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>

/**
 * Sprint 4 Step 56 — Admin Payments visibility (read-only, same boundary as
 * Subscriptions above: no schema here accepts a status/amount *write*).
 * `userId` filters to one student's payment history (linked from the
 * Subscriptions admin page); omitted, it's every payment across the
 * platform.
 */
export const listAdminPaymentsQuerySchema = z.object({
  userId: z.string().refine(isValidObjectId, 'Invalid userId').optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListAdminPaymentsQuery = z.infer<typeof listAdminPaymentsQuerySchema>

/**
 * Sprint 4 Step 58 — Admin AI Usage dashboard. `days` widens the reporting
 * window past "today" (default) for trend visibility without a separate
 * date-range endpoint; `limit` caps the byUser/byQuestion leaderboards.
 */
export const aiUsageDashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})
export type AiUsageDashboardQuery = z.infer<typeof aiUsageDashboardQuerySchema>
