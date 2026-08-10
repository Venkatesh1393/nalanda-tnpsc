import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
  type Unsubscribe,
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'

import { firebaseAuth, googleAuthProvider } from '@/lib/firebase'

/**
 * Real Firebase Web SDK calls (docs/Authentication.md §1/§3, this session's
 * Sprint 3 Firebase step) — the one module that imports `firebase/auth`
 * directly, so a future provider swap or SDK upgrade touches only this
 * file. `services/authService.ts` is the facade every page/component
 * actually imports from; it delegates the Google/Email-Password paths here.
 */

const ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use':
    'An account with this email already exists — try logging in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Choose a stronger password (at least 6 characters).',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
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

export async function registerWithEmailPassword(
  name: string,
  email: string,
  password: string,
): Promise<FirebaseUser> {
  try {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    // Set before the caller reads an ID token, so the token's `name` claim
    // is populated on the very first sync (services/auth.service.ts on the
    // backend reads `name` from the decoded token, not a separate field).
    await updateProfile(credential.user, { displayName: name })
    return credential.user
  } catch (error) {
    throw toFriendlyError(error)
  }
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  try {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password)
    return credential.user
  } catch (error) {
    throw toFriendlyError(error)
  }
}

export async function signInWithGooglePopup(): Promise<FirebaseUser> {
  try {
    const credential = await signInWithPopup(firebaseAuth, googleAuthProvider)
    return credential.user
  } catch (error) {
    throw toFriendlyError(error)
  }
}

export async function firebaseSignOut(): Promise<void> {
  await signOut(firebaseAuth)
}

/**
 * Exposed per this step's requirements, but deliberately not wired as the
 * app's primary "am I logged in" signal — Nalanda's own access token +
 * refresh cookie is that source of truth (docs/Authentication.md §1: "Do
 * not unnecessarily use Firebase ID tokens as the permanent application
 * session"). Useful for reacting to Firebase-side sign-out completing, or
 * future features that need to know Firebase's own local auth state.
 */
export function onFirebaseAuthStateChanged(
  callback: (user: FirebaseUser | null) => void,
): Unsubscribe {
  return onAuthStateChanged(firebaseAuth, callback)
}

/** Fetches a fresh Firebase ID token for the currently signed-in Firebase
 * user, or null if none — used once, immediately after
 * register/login/Google sign-in, to hand to the backend
 * (`POST /auth/email` / `POST /auth/google`). */
export async function getCurrentFirebaseIdToken(
  forceRefresh = false,
): Promise<string | null> {
  const user = firebaseAuth.currentUser
  if (!user) return null
  return user.getIdToken(forceRefresh)
}
