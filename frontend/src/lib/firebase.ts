import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth } from 'firebase/auth'

import { env } from '@/lib/env'

/**
 * The one Firebase Web SDK initialization point (docs/Authentication.md
 * §1/§3) — every auth call in `services/firebaseAuthService.ts` builds on
 * this `firebaseAuth` instance, never a second `initializeApp()` call.
 * Config values come only from `env` (Vite env vars), never hardcoded —
 * see `.env.example` for why these are safe to ship client-side at all
 * (unlike the Admin SDK service account, which never leaves the backend).
 */
const firebaseApp = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

export const firebaseAuth = getAuth(firebaseApp)

/** One shared provider instance — configuring scopes/custom parameters once
 * here (none needed today) rather than per call site. */
export const googleAuthProvider = new GoogleAuthProvider()
