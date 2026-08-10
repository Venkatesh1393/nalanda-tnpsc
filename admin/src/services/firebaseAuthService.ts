import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'

import { firebaseAuth, googleAuthProvider } from '@/lib/firebase'

/**
 * The one module that imports `firebase/auth` directly — mirrors
 * frontend/src/services/firebaseAuthService.ts's Google + Email/Password
 * paths exactly (Email OTP has no equivalent here — self-registration via
 * a one-time code has no meaning for admin-staff accounts). Registering an
 * account here does **not** grant admin access by itself — a brand-new
 * account always lands as `role: 'user'` unless a `super_admin` already
 * created a matching invite (`services/adminService.ts`'s `createInvite`),
 * in which case the invited role is applied automatically on this exact
 * first sign-in (`backend/src/services/auth/userSync.service.ts`).
 */

const ERROR_MESSAGES: Record<string, string> = {
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
  'auth/email-already-in-use':
    'An account with this email already exists — try signing in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Choose a stronger password (at least 6 characters).',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
}

export class FirebaseAuthError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'FirebaseAuthError'
    this.code = code
  }
}

function toFriendlyError(error: unknown): FirebaseAuthError {
  if (error instanceof FirebaseError) {
    return new FirebaseAuthError(
      error.code,
      ERROR_MESSAGES[error.code] ?? 'Something went wrong. Please try again.',
    )
  }
  return new FirebaseAuthError('unknown', 'Something went wrong. Please try again.')
}

export async function signInWithGooglePopup() {
  try {
    return (await signInWithPopup(firebaseAuth, googleAuthProvider)).user
  } catch (error) {
    throw toFriendlyError(error)
  }
}

export async function registerWithEmailPassword(
  name: string,
  email: string,
  password: string,
) {
  try {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    // Set before the caller reads an ID token, so the token's `name` claim
    // is populated on the very first sync (mirrors frontend's identical
    // ordering in services/firebaseAuthService.ts).
    await updateProfile(credential.user, { displayName: name })
    return credential.user
  } catch (error) {
    throw toFriendlyError(error)
  }
}

export async function loginWithEmailPassword(email: string, password: string) {
  try {
    return (await signInWithEmailAndPassword(firebaseAuth, email, password)).user
  } catch (error) {
    throw toFriendlyError(error)
  }
}

export async function firebaseSignOut(): Promise<void> {
  await signOut(firebaseAuth)
}

export async function getCurrentFirebaseIdToken(
  forceRefresh = false,
): Promise<string | null> {
  const user = firebaseAuth.currentUser
  if (!user) return null
  return user.getIdToken(forceRefresh)
}
