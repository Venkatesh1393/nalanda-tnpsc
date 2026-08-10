import crypto from 'node:crypto'

import jwt, { type SignOptions } from 'jsonwebtoken'

import { env } from '../config/env'
import type { AccessTokenPayload, RefreshTokenPayload } from '../types/jwt.types'

function decodeKey(base64Key: string): string {
  return Buffer.from(base64Key, 'base64').toString('utf-8')
}

const accessPrivateKey = decodeKey(env.JWT_ACCESS_PRIVATE_KEY_BASE64)
const accessPublicKey = decodeKey(env.JWT_ACCESS_PUBLIC_KEY_BASE64)
const refreshPrivateKey = decodeKey(env.JWT_REFRESH_PRIVATE_KEY_BASE64)
const refreshPublicKey = decodeKey(env.JWT_REFRESH_PUBLIC_KEY_BASE64)

// env.ts validates these are non-empty strings but can't express jsonwebtoken's
// branded `StringValue` template-literal type (e.g. "15m", "30d") — the values
// are only ever set via .env, so this cast is safe at the boundary.
const accessExpiresIn = env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn']
const refreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn']

type NewAccessTokenClaims = Pick<AccessTokenPayload, 'sub' | 'role' | 'subscriptionTier'>

/**
 * Signs a Nalanda access token — RS256, short-lived, per docs/Authentication.md
 * §4. Carries `role`/`subscriptionTier` as two independent claims (never
 * merged) so authorize-by-role and authorize-by-tier stay separate checks.
 */
export function signAccessToken(claims: NewAccessTokenClaims): string {
  return jwt.sign(claims, accessPrivateKey, {
    algorithm: 'RS256',
    expiresIn: accessExpiresIn,
    issuer: env.JWT_ISSUER,
    jwtid: crypto.randomUUID(),
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, accessPublicKey, {
    algorithms: ['RS256'],
    issuer: env.JWT_ISSUER,
  }) as AccessTokenPayload
}

/**
 * Signs a Nalanda refresh token — one per session/device, 30-day TTL.
 * `familyId` stays constant across a token's rotation lineage so
 * reuse-detection (docs/Authentication.md §5) can revoke the whole family
 * if an already-rotated token is presented again.
 */
export function signRefreshToken(
  sub: string,
  familyId: string = crypto.randomUUID(),
): string {
  return jwt.sign({ sub, familyId }, refreshPrivateKey, {
    algorithm: 'RS256',
    expiresIn: refreshExpiresIn,
    issuer: env.JWT_ISSUER,
    jwtid: crypto.randomUUID(),
  })
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, refreshPublicKey, {
    algorithms: ['RS256'],
    issuer: env.JWT_ISSUER,
  }) as RefreshTokenPayload
}
