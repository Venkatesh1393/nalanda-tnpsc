import type { Types } from 'mongoose'

import {
  Session,
  type SessionDocument,
  type SessionRevokeReason,
} from '../models/Session.model'

export function create(data: {
  userId: Types.ObjectId
  refreshTokenHash: string
  familyId: string
  deviceInfo?: string
  rememberMe: boolean
}): Promise<SessionDocument> {
  return Session.create(data)
}

/** Looks up a session by its refresh token's hash regardless of revoked
 * status — reuse detection (docs/Authentication.md §5) depends on being
 * able to find an *already-revoked* record, not just active ones. */
export function findByHash(refreshTokenHash: string): Promise<SessionDocument | null> {
  return Session.findOne({ refreshTokenHash })
}

export function touchLastUsed(sessionId: Types.ObjectId): Promise<void> {
  return Session.updateOne({ _id: sessionId }, { $set: { lastUsedAt: new Date() } }).then(
    () => undefined,
  )
}

export function revokeById(
  sessionId: Types.ObjectId,
  reason: SessionRevokeReason,
): Promise<void> {
  return Session.updateOne(
    { _id: sessionId },
    { $set: { revoked: true, revokedAt: new Date(), revokedReason: reason } },
  ).then(() => undefined)
}

/** Revokes every session in a rotation lineage — the theft-detection
 * response (docs/Authentication.md §5): reusing an already-rotated token
 * torches the whole family, not just the one token presented. */
export function revokeFamily(
  familyId: string,
  reason: SessionRevokeReason,
): Promise<number> {
  return Session.updateMany(
    { familyId, revoked: false },
    { $set: { revoked: true, revokedAt: new Date(), revokedReason: reason } },
  ).then((result) => result.modifiedCount)
}

export function revokeAllForUser(
  userId: Types.ObjectId | string,
  reason: SessionRevokeReason,
): Promise<number> {
  return Session.updateMany(
    { userId, revoked: false },
    { $set: { revoked: true, revokedAt: new Date(), revokedReason: reason } },
  ).then((result) => result.modifiedCount)
}
