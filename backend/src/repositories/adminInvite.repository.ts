import type { Types } from 'mongoose'

import {
  AdminInvite,
  type AdminInviteDocument,
  type IAdminInvite,
} from '../models/AdminInvite.model'

export function findPendingByEmail(email: string): Promise<AdminInviteDocument | null> {
  return AdminInvite.findOne({ email: email.toLowerCase(), status: 'pending' })
}

/** Atomically finds-and-consumes a pending invite by email in one operation
 * — called from `services/auth/userSync.service.ts` at the exact moment a
 * new `User` is created, so two near-simultaneous first sign-ins for the
 * same invited email can never both apply the same invite. */
export function consumePendingByEmail(
  email: string,
): Promise<AdminInviteDocument | null> {
  return AdminInvite.findOneAndUpdate(
    { email: email.toLowerCase(), status: 'pending' },
    { $set: { status: 'consumed', consumedAt: new Date() } },
    { new: false },
  )
}

export function findById(inviteId: string): Promise<AdminInviteDocument | null> {
  return AdminInvite.findById(inviteId)
}

export function create(
  data: Pick<IAdminInvite, 'email' | 'role' | 'invitedByEmail'> & {
    invitedById: Types.ObjectId | string
  },
): Promise<AdminInviteDocument> {
  return AdminInvite.create({ ...data, email: data.email.toLowerCase() })
}

export async function list(
  status: IAdminInvite['status'] | undefined,
  page: number,
  limit: number,
): Promise<{ items: AdminInviteDocument[]; total: number }> {
  const query = status ? { status } : {}
  const [items, total] = await Promise.all([
    AdminInvite.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AdminInvite.countDocuments(query),
  ])
  return { items, total }
}

export function markConsumed(inviteId: string): Promise<AdminInviteDocument | null> {
  return AdminInvite.findByIdAndUpdate(
    inviteId,
    { $set: { status: 'consumed', consumedAt: new Date() } },
    { new: true },
  )
}

export function markRevoked(inviteId: string): Promise<AdminInviteDocument | null> {
  return AdminInvite.findOneAndUpdate(
    { _id: inviteId, status: 'pending' },
    { $set: { status: 'revoked', revokedAt: new Date() } },
    { new: true },
  )
}
