import type { auth } from 'firebase-admin'

import type { AuthProvider } from '../constants/user'
import type { UserDocument } from '../models/User.model'
import * as profileRepository from '../repositories/profile.repository'
import * as userRepository from '../repositories/user.repository'
import { ApiError } from '../utils/ApiError'
import { findOrCreateUserFromFirebase } from './auth/userSync.service'
import {
  issueSession,
  revokeAllSessions,
  revokeSession,
  rotateSession,
  type TokenPair,
} from './auth/session.service'

export interface EstablishedSession {
  user: UserDocument
  /** Only fetched here so the frontend can greet the user immediately
   * without a second round-trip to a (not-yet-built) `GET /profile` — never
   * a substitute for that future endpoint's fuller response. */
  profileName: string
  isNewUser: boolean
  /** Step 44 — lets the frontend route a returning user with an
   * abandoned-mid-wizard Profile back to Onboarding instead of the
   * Dashboard, without a second round-trip to `GET /onboarding`. */
  onboardingCompleted: boolean
  tokens: TokenPair
}

/**
 * The single entry point both `POST /auth/google` and `POST /auth/email`
 * call — identical logic regardless of which Firebase provider produced
 * the token, per this step's design (find-or-create is provider-agnostic;
 * only the `authProvider` label recorded on a *new* user differs).
 */
export async function establishSessionFromFirebase(
  decoded: auth.DecodedIdToken,
  authProvider: AuthProvider,
  deviceInfo: string | undefined,
  rememberMe: boolean,
): Promise<EstablishedSession> {
  const { user, isNewUser } = await findOrCreateUserFromFirebase(decoded, authProvider)
  await userRepository.touchLastLogin(user.id)
  const [tokens, profile] = await Promise.all([
    issueSession(user, deviceInfo, rememberMe),
    profileRepository.findByUserId(user._id),
  ])
  return {
    user,
    profileName: profile?.name ?? user.email.split('@')[0] ?? 'Aspirant',
    isNewUser,
    onboardingCompleted: profile?.onboarding.completed ?? false,
    tokens,
  }
}

export function refreshSession(
  rawRefreshToken: string,
  deviceInfo: string | undefined,
): Promise<TokenPair> {
  return rotateSession(rawRefreshToken, deviceInfo)
}

export function logout(rawRefreshToken: string): Promise<void> {
  return revokeSession(rawRefreshToken)
}

export function logoutAll(userId: string): Promise<number> {
  return revokeAllSessions(userId)
}

export interface CurrentUser {
  user: UserDocument
  profileName: string
  onboardingCompleted: boolean
}

/** Backs `GET /auth/me` — the JWT's own claims (`sub`/`role`/`subscriptionTier`)
 * don't carry email/name, so a fresh lookup is needed to return the same
 * public shape `establishSessionFromFirebase` does. */
export async function getCurrentUser(userId: string): Promise<CurrentUser> {
  const user = await userRepository.findById(userId)
  if (!user)
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.')

  const profile = await profileRepository.findByUserId(user._id)
  return {
    user,
    profileName: profile?.name ?? user.email.split('@')[0] ?? 'Aspirant',
    onboardingCompleted: profile?.onboarding.completed ?? false,
  }
}
