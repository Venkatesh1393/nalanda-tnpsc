import crypto from 'node:crypto'

import * as sessionRepository from '../../repositories/session.repository'
import * as userRepository from '../../repositories/user.repository'
import type { UserDocument } from '../../models/User.model'
import { ApiError } from '../../utils/ApiError'
import { sha256 } from '../../utils/hash'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt'

export interface TokenPair {
  accessToken: string
  refreshToken: string
  /** Echoes the cookie-persistence policy this pair should be set with —
   * known outright on login/register (the caller passed it in), threaded
   * through on refresh (no request body to read it from, so it's carried
   * forward from the session record instead). */
  rememberMe: boolean
}

function buildAccessToken(user: UserDocument): string {
  return signAccessToken({
    sub: user.id,
    role: user.role,
    subscriptionTier: user.subscriptionTier,
  })
}

/** Issues a brand-new session (new rotation family) — called on
 * login/register, never on refresh (see `rotateSession` for that). */
export async function issueSession(
  user: UserDocument,
  deviceInfo: string | undefined,
  rememberMe: boolean,
): Promise<TokenPair> {
  const familyId = crypto.randomUUID()
  const refreshToken = signRefreshToken(user.id, familyId)

  await sessionRepository.create({
    userId: user._id,
    refreshTokenHash: sha256(refreshToken),
    familyId,
    deviceInfo,
    rememberMe,
  })

  return { accessToken: buildAccessToken(user), refreshToken, rememberMe }
}

/**
 * Validates + rotates a presented refresh token (docs/Authentication.md
 * §5). A refresh token is single-use: every call here invalidates the
 * presented token and issues a new one in the same rotation family. If the
 * presented token's hash matches an *already-revoked* session record, that
 * means it was already used once before — reuse detected — and the entire
 * family is torched immediately, forcing re-authentication everywhere.
 */
export async function rotateSession(
  rawRefreshToken: string,
  deviceInfo: string | undefined,
): Promise<TokenPair> {
  let payload
  try {
    payload = verifyRefreshToken(rawRefreshToken)
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.')
  }

  const tokenHash = sha256(rawRefreshToken)
  const session = await sessionRepository.findByHash(tokenHash)

  if (!session) {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.')
  }

  if (session.revoked) {
    await sessionRepository.revokeFamily(session.familyId, 'reuse_detected')
    throw ApiError.unauthorized(
      'Your session was revoked for security reasons. Please sign in again.',
    )
  }

  const user = await userRepository.findById(payload.sub)
  if (!user) {
    await sessionRepository.revokeById(session._id, 'admin')
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.')
  }

  await sessionRepository.revokeById(session._id, 'rotated')

  const newRefreshToken = signRefreshToken(user.id, session.familyId)
  await sessionRepository.create({
    userId: user._id,
    refreshTokenHash: sha256(newRefreshToken),
    familyId: session.familyId,
    deviceInfo,
    rememberMe: session.rememberMe,
  })

  return {
    accessToken: buildAccessToken(user),
    refreshToken: newRefreshToken,
    rememberMe: session.rememberMe,
  }
}

/** Revokes just the one session a raw refresh token belongs to
 * (`POST /auth/logout` — single device). Silently no-ops on an
 * already-invalid token, since "log me out" should never itself fail. */
export async function revokeSession(rawRefreshToken: string): Promise<void> {
  const session = await sessionRepository.findByHash(sha256(rawRefreshToken))
  if (session && !session.revoked) {
    await sessionRepository.revokeById(session._id, 'logout')
  }
}

/** Revokes every session for a user (`POST /auth/logout-all`). */
export function revokeAllSessions(userId: string): Promise<number> {
  return sessionRepository.revokeAllForUser(userId, 'logout_all')
}
