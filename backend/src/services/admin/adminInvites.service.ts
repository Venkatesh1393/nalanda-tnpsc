import type { Role } from '../../constants/roles'
import type { AdminInviteDocument, IAdminInvite } from '../../models/AdminInvite.model'
import * as adminInviteRepository from '../../repositories/adminInvite.repository'
import * as userRepository from '../../repositories/user.repository'
import { ApiError } from '../../utils/ApiError'
import * as auditLogService from '../auditLog.service'
import type { ActingAdmin } from './adminUsers.service'

export interface AdminInviteDTO {
  id: string
  email: string
  role: Role
  invitedByEmail: string
  status: IAdminInvite['status']
  createdAt: Date | null
  consumedAt: Date | null
  revokedAt: Date | null
}

function toDTO(invite: AdminInviteDocument): AdminInviteDTO {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    invitedByEmail: invite.invitedByEmail,
    status: invite.status,
    createdAt: invite.createdAt ?? null,
    consumedAt: invite.consumedAt ?? null,
    revokedAt: invite.revokedAt ?? null,
  }
}

export type CreateInviteResult =
  | {
      outcome: 'role_applied_immediately'
      user: { id: string; email: string; role: Role }
    }
  | { outcome: 'invite_created'; invite: AdminInviteDTO }

/**
 * `super_admin` only (route-level `authorizeRoles('super_admin')`) — this
 * is Step 52's "register account for new admins" flow. Two outcomes:
 * - The email already has a `User` → the role is applied to it directly,
 *   right now, no invite document is created at all.
 * - No `User` exists for that email yet → a pending `AdminInvite` is
 *   created; the role is applied automatically the moment that email first
 *   signs in (`services/auth/userSync.service.ts`).
 */
export async function createInvite(
  actor: ActingAdmin,
  email: string,
  role: Role,
): Promise<CreateInviteResult> {
  const normalizedEmail = email.toLowerCase().trim()
  const actingUser = await userRepository.findById(actor.id)
  const actorAuditIdentity = {
    id: actor.id,
    role: actor.role,
    email: actingUser?.email ?? 'unknown',
  }

  const existingUser = await userRepository.findByEmail(normalizedEmail)
  if (existingUser) {
    const previousRole = existingUser.role
    const updated = await userRepository.updateRole(existingUser.id, role)
    if (!updated) throw ApiError.notFound('User not found')

    await auditLogService.recordAction(
      actorAuditIdentity,
      'user.role.update',
      'User',
      existingUser.id,
      { previousRole, newRole: role, via: 'invite' },
    )

    return {
      outcome: 'role_applied_immediately',
      user: { id: updated.id, email: updated.email, role: updated.role },
    }
  }

  // Re-inviting an email that already has a pending invite updates that
  // invite in place (new role, new inviter) rather than creating a second,
  // redundant pending document for the same email.
  const existingPending = await adminInviteRepository.findPendingByEmail(normalizedEmail)
  if (existingPending) {
    await adminInviteRepository.markRevoked(existingPending.id)
  }

  const invite = await adminInviteRepository.create({
    email: normalizedEmail,
    role,
    invitedById: actor.id,
    invitedByEmail: actorAuditIdentity.email,
  })

  await auditLogService.recordAction(
    actorAuditIdentity,
    'admin.invite.created',
    'AdminInvite',
    invite.id,
    { email: normalizedEmail, role },
  )

  return { outcome: 'invite_created', invite: toDTO(invite) }
}

export async function listInvites(
  status: IAdminInvite['status'] | undefined,
  page: number,
  limit: number,
): Promise<{ items: AdminInviteDTO[]; total: number }> {
  const { items, total } = await adminInviteRepository.list(status, page, limit)
  return { items: items.map(toDTO), total }
}

export async function revokeInvite(
  actor: ActingAdmin,
  inviteId: string,
): Promise<AdminInviteDTO> {
  const invite = await adminInviteRepository.findById(inviteId)
  if (!invite) throw ApiError.notFound('Invite not found')
  if (invite.status !== 'pending') {
    throw ApiError.badRequest('Only a pending invite can be revoked.')
  }

  const revoked = await adminInviteRepository.markRevoked(inviteId)
  if (!revoked) throw ApiError.notFound('Invite not found')

  const actingUser = await userRepository.findById(actor.id)
  await auditLogService.recordAction(
    { id: actor.id, role: actor.role, email: actingUser?.email ?? 'unknown' },
    'admin.invite.revoked',
    'AdminInvite',
    inviteId,
    { email: revoked.email, role: revoked.role },
  )

  return toDTO(revoked)
}
