import admin from 'firebase-admin'

import { env } from './env'
import { logger } from './logger'
import { ApiError } from '../utils/ApiError'
import { withTimeout } from '../utils/resilience'

/** Sprint 4 Step 73 — `verifyIdToken` makes a real network call to Google
 * (fetching/caching Firebase's public signing keys, then validating against
 * them) with no timeout of its own; bounds how long an auth request can
 * hang if Google's endpoint is slow/unreachable, instead of leaving the
 * request open indefinitely. No retry here — a failed verification should
 * fail the login attempt immediately (fail-closed), not silently delay it. */
const VERIFY_TOKEN_TIMEOUT_MS = 10_000

let firebaseApp: admin.app.App | undefined

/**
 * Lazily initializes the single Firebase Admin app instance — called at
 * most once per process (`firebaseApp` is cached), per this step's "Firebase
 * Admin only once" requirement. Firebase only verifies identity (Google
 * OAuth, Email/Password, the custom Email OTP bridge); every subsequent API
 * call is authorized against Nalanda's own JWT (`middleware/auth.middleware.ts`),
 * never a Firebase token directly (docs/Authentication.md §1/§4).
 */
export function getFirebaseAdmin(): admin.app.App {
  if (firebaseApp) return firebaseApp

  let privateKey: string
  try {
    privateKey = Buffer.from(env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8')
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Decoded value does not look like a PEM private key')
    }
  } catch {
    // Never include the actual (malformed) key material in the log —
    // only that it failed to decode.
    logger.error('FIREBASE_PRIVATE_KEY_BASE64 is malformed — could not decode a PEM key')
    throw new Error('Firebase Admin SDK misconfigured: invalid private key')
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    })
  } catch (error) {
    logger.error('Firebase Admin SDK failed to initialize', {
      message: error instanceof Error ? error.message : 'unknown error',
    })
    throw new Error('Firebase Admin SDK misconfigured: could not initialize app', {
      cause: error,
    })
  }

  logger.info('Firebase Admin SDK initialized')
  return firebaseApp
}

/**
 * Verifies a client-obtained Firebase ID token (Google popup or
 * Email/Password sign-in) and returns its decoded claims — the single
 * place `firebase-admin`'s `verifyIdToken` is called from
 * (`middleware/verifyFirebaseToken.middleware.ts` is the only caller).
 * Never logs the token itself; Firebase's own error detail is swallowed
 * behind a generic `ApiError` so a client can't distinguish "expired,"
 * "malformed," and "revoked" from the response (docs/Authentication.md
 * §12's account-enumeration/generic-error-messages rule).
 */
export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<admin.auth.DecodedIdToken> {
  try {
    return await withTimeout(
      getFirebaseAdmin().auth().verifyIdToken(idToken),
      VERIFY_TOKEN_TIMEOUT_MS,
      'Firebase token verification',
    )
  } catch (error) {
    logger.warn('Firebase ID token verification failed', {
      code: (error as { code?: string }).code ?? 'unknown',
    })
    throw ApiError.unauthorized(
      'Your sign-in could not be verified. Please sign in again.',
    )
  }
}
