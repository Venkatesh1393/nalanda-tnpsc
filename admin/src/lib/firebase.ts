import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth } from 'firebase/auth'

import { env } from '@/lib/env'

/**
 * The one Firebase Web SDK initialization point in this app — same project
 * as frontend/'s (Step 52's "reuse existing authentication" requirement:
 * one identity provider, two clients). Admin staff sign in with the exact
 * same Google account their student-facing session (if any) would use;
 * what makes them "admin" is their `role` claim on the Nalanda-issued JWT,
 * never anything Firebase-side.
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
export const googleAuthProvider = new GoogleAuthProvider()
