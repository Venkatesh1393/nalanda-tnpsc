import type { Role, SubscriptionTier } from '../constants/roles'

/** Claims embedded in a Nalanda-issued access token — docs/Authentication.md §4. */
export interface AccessTokenPayload {
  sub: string
  role: Role
  subscriptionTier: SubscriptionTier
  jti: string
  iat: number
  exp: number
}

/** Claims embedded in a Nalanda-issued refresh token — one per session/device. */
export interface RefreshTokenPayload {
  sub: string
  jti: string
  familyId: string
  iat: number
  exp: number
}
