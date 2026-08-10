import type { Role } from '../../constants/roles'
import type { UserStatus } from '../../constants/user'
import type { UserDocument } from '../../models/User.model'
import * as profileRepository from '../../repositories/profile.repository'
import * as userRepository from '../../repositories/user.repository'
import type { AdminUserListFilter } from '../../repositories/user.repository'
import { ApiError } from '../../utils/ApiError'
import * as auditLogService from '../auditLog.service'

/** The controller only has `id`/`role` from the JWT (no `email` claim) —
 * the service resolves the acting user's current email itself right before
 * writing an audit entry, so `AuditLog.actorEmail` is always accurate
 * rather than trusting a claim that doesn't exist. */
export type ActingAdmin = { id: string; role: Role }

async function resolveAuditActor(actor: ActingAdmin) {
  const actingUser = await userRepository.findById(actor.id)
  return { id: actor.id, role: actor.role, email: actingUser?.email ?? 'unknown' }
}

export interface AdminUserSummaryDTO {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  subscriptionTier: UserDocument['subscriptionTier']
  createdAt: Date | null
  lastLoginAt: Date | null
}

function toSummaryDTO(user: UserDocument, name: string): AdminUserSummaryDTO {
  return {
    id: user.id,
    name,
    email: user.email,
    role: user.role,
    status: user.status,
    subscriptionTier: user.subscriptionTier,
    createdAt: user.createdAt ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
  }
}

export async function listUsers(
  filter: AdminUserListFilter,
  page: number,
  limit: number,
): Promise<{ items: AdminUserSummaryDTO[]; total: number; page: number; limit: number }> {
  const { items, total } = await userRepository.listForAdmin(filter, page, limit)
  const profiles = await profileRepository.findByUserIds(items.map((user) => user.id))
  const nameByUserId = new Map(
    profiles.map((profile) => [profile.userId.toString(), profile.name]),
  )

  return {
    items: items.map((user) =>
      toSummaryDTO(user, nameByUserId.get(user.id) ?? user.email),
    ),
    total,
    page,
    limit,
  }
}

async function loadUserOrThrow(userId: string): Promise<UserDocument> {
  const user = await userRepository.findById(userId)
  if (!user) throw ApiError.notFound('User not found')
  return user
}

export async function getUserById(userId: string): Promise<AdminUserSummaryDTO> {
  const user = await loadUserOrThrow(userId)
  const profile = await profileRepository.findByUserId(userId)
  return toSummaryDTO(user, profile?.name ?? user.email)
}

/**
 * `admin`/`moderator`/`super_admin` only (route-level `authorizeRoles`,
 * docs/Authentication.md §7's permission matrix). Writes an audit entry on
 * every successful change — this is exactly the kind of privileged action
 * `AuditLog.model.ts` exists to make attributable.
 */
export async function updateUserStatus(
  actor: ActingAdmin,
  userId: string,
  nextStatus: UserStatus,
): Promise<AdminUserSummaryDTO> {
  const user = await loadUserOrThrow(userId)
  const previousStatus = user.status

  const updated = await userRepository.updateStatus(userId, nextStatus)
  if (!updated) throw ApiError.notFound('User not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'user.status.update', 'User', userId, {
    previousStatus,
    newStatus: nextStatus,
  })

  const profile = await profileRepository.findByUserId(userId)
  return toSummaryDTO(updated, profile?.name ?? updated.email)
}

/**
 * `super_admin` only (route-level `authorizeRoles('super_admin')`) — this is
 * Step 52's explicit "only super_admin should perform highly privileged
 * role changes" requirement, deliberately stricter here than
 * `docs/API.md`'s older `role: admin only` note. Mirrors that same doc's
 * "an admin cannot demote themselves via this endpoint" guard (prevents an
 * accidental self-lockout with no other super_admin left to reverse it).
 */
export async function updateUserRole(
  actor: ActingAdmin,
  userId: string,
  nextRole: Role,
): Promise<AdminUserSummaryDTO> {
  if (actor.id === userId) {
    throw ApiError.badRequest('You cannot change your own role from this endpoint.')
  }

  const user = await loadUserOrThrow(userId)
  const previousRole = user.role

  const updated = await userRepository.updateRole(userId, nextRole)
  if (!updated) throw ApiError.notFound('User not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'user.role.update', 'User', userId, {
    previousRole,
    newRole: nextRole,
  })

  const profile = await profileRepository.findByUserId(userId)
  return toSummaryDTO(updated, profile?.name ?? updated.email)
}
