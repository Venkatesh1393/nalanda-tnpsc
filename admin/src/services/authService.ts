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
 * Posts a verified Firebase ID token to the real backend and returns the
 * established Nalanda session — the exact same `POST /auth/google` /
 * `POST /auth/email` contracts `frontend/src/services/authService.ts` uses
 * (Step 52's "reuse existing authentication and RBAC" requirement: one
 * backend session-issuance path, two frontends).
 */
async function establishBackendSession(path: string): Promise<EstablishedSession> {
  const firebaseIdToken = await getCurrentFirebaseIdToken()
  if (!firebaseIdToken) {
    throw new Error('No Firebase session to establish a Nalanda session from.')
  }

  const response = await apiClient.post<{
    data: { accessToken: string; user: AuthUser; isNewUser: boolean }
  }>(path, { firebaseIdToken, rememberMe: true })

  return response.data.data
}

export async function loginWithGoogle(): Promise<EstablishedSession> {
  await signInWithGooglePopup()
  return establishBackendSession(endpoints.auth.google)
}

export async function registerWithEmailPassword(
  name: string,
  email: string,
  password: string,
): Promise<EstablishedSession> {
  await firebaseRegisterWithEmailPassword(name, email, password)
  return establishBackendSession(endpoints.auth.email)
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<EstablishedSession> {
  await firebaseLoginWithEmailPassword(email, password)
  return establishBackendSession(endpoints.auth.email)
}
