import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { AuthUser, EstablishedSession } from '@/types/auth'
import {
  getCurrentFirebaseIdToken,
  loginWithEmailPassword as firebaseLoginWithEmailPassword,
  registerWithEmailPassword as firebaseRegisterWithEmailPassword,
  signInWithGooglePopup,
} from './firebaseAuthService'

/**
 * The Auth domain facade every page/component imports from (docs/API.md
 * §1). As of this session's Firebase Authentication step, this file is
 * deliberately a **hybrid**, not fully real or fully mocked:
 *
 * - `loginWithGoogle`, `registerWithEmailPassword`, `loginWithEmailPassword`
 *   are REAL — Firebase Web SDK (`firebaseAuthService.ts`) obtains an ID
 *   token, then the real backend (`POST /auth/google` / `POST /auth/email`)
 *   verifies it and establishes a Nalanda session.
 * - `requestEmailOtp`, `resendEmailOtp`, `verifyEmailOtp`, `registerIndividual`
 *   remain MOCKED — the custom backend Email OTP module
 *   (docs/Authentication.md §2: Redis-backed generation/hashing/delivery)
 *   was explicitly out of scope for this step; that flow is untouched.
 *
 * This mirrors the "add Email/Password alongside existing Google + OTP"
 * decision for this session — nothing about the OTP path changed.
 */
export const MOCK_ACCEPTED_OTP = '123456'

// Shortened from the real 10-minute TTL (docs/Authentication.md §2) so the
// resend/expiry UI is actually exercisable in a local demo session.
export const MOCK_OTP_TTL_SECONDS = 60
export const MOCK_RESEND_COOLDOWN_SECONDS = 30
// docs/OTP_Flow.md §5 — the expiry warning only surfaces in the final
// ~10% of the code's validity window; scaled down from the real "final
// 60 seconds of 10 minutes" ratio to fit the shortened mock TTL above.
export const MOCK_EXPIRY_WARNING_SECONDS = 10
// docs/OTP_Flow.md §6 — lockout after the 5th wrong attempt, +30s delay
// before "Request New Code" becomes tappable again.
export const MOCK_MAX_OTP_ATTEMPTS = 5
export const MOCK_LOCKOUT_SECONDS = 30

export type AuthErrorCode =
  | 'INVALID_OTP'
  | 'OTP_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'RESEND_COOLDOWN_ACTIVE'

export class AuthMockError extends Error {
  code: AuthErrorCode
  constructor(code: AuthErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function requestEmailOtp(
  email: string,
): Promise<{ otpExpiresInSeconds: number }> {
  await delay(700)
  void email
  return { otpExpiresInSeconds: MOCK_OTP_TTL_SECONDS }
}

export async function resendEmailOtp(
  email: string,
): Promise<{ cooldownSeconds: number }> {
  await delay(500)
  void email
  return { cooldownSeconds: MOCK_RESEND_COOLDOWN_SECONDS }
}

export async function verifyEmailOtp(
  email: string,
  otp: string,
): Promise<{ user: AuthUser; accessToken: string }> {
  await delay(700)
  if (otp !== MOCK_ACCEPTED_OTP) {
    throw new AuthMockError(
      'INVALID_OTP',
      'That code isn’t right. Double check and try again.',
    )
  }
  return {
    user: {
      id: 'mock-user-1',
      name: email.split('@')[0] ?? 'Aspirant',
      email,
      role: 'user',
      subscriptionTier: 'free',
      // This path has no real backend behind it (docs/Authentication.md §2
      // — Email OTP remains mocked), so there's no real Profile to read an
      // onboarding flag from; default to "not onboarded" like a genuine
      // first-time signup would be.
      onboardingCompleted: false,
    },
    accessToken: 'mock-access-token',
  }
}

export async function registerIndividual(data: {
  name: string
  email: string
}): Promise<{ otpExpiresInSeconds: number }> {
  await delay(700)
  void data
  return { otpExpiresInSeconds: MOCK_OTP_TTL_SECONDS }
}

/** Posts a verified Firebase ID token to the real backend and returns the
 * established Nalanda session — shared by Google and Email/Password, which
 * differ only in which endpoint and how the ID token was obtained. */
async function establishBackendSession(
  path: string,
  rememberMe: boolean,
): Promise<EstablishedSession> {
  const firebaseIdToken = await getCurrentFirebaseIdToken()
  if (!firebaseIdToken) {
    throw new Error('No Firebase session to establish a Nalanda session from.')
  }

  const response = await apiClient.post<{
    data: { accessToken: string; user: AuthUser; isNewUser: boolean }
  }>(path, { firebaseIdToken, rememberMe })

  return response.data.data
}

export async function loginWithGoogle(rememberMe = true): Promise<EstablishedSession> {
  await signInWithGooglePopup()
  return establishBackendSession(endpoints.auth.google, rememberMe)
}

export async function registerWithEmailPassword(
  name: string,
  email: string,
  password: string,
): Promise<EstablishedSession> {
  await firebaseRegisterWithEmailPassword(name, email, password)
  // Registration always creates a new Nalanda account, but Remember Me
  // isn't collected on this form (docs/Authentication.md §9 frames it as a
  // Login-time choice) — default true, matching Register's existing OTP
  // path (`VerifyEmailPage`'s `rememberMe = true` default for `intent === 'register'`).
  return establishBackendSession(endpoints.auth.email, true)
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
  rememberMe = true,
): Promise<EstablishedSession> {
  await firebaseLoginWithEmailPassword(email, password)
  return establishBackendSession(endpoints.auth.email, rememberMe)
}
