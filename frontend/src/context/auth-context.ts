import { createContext } from 'react'

import type { AuthUser } from '@/types/auth'

export type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  /** True until the provider has attempted a silent refresh on mount —
   * route guards wait for this before deciding whether to redirect, so a
   * page reload never flashes the login page before a valid refresh
   * cookie has had a chance to restore the session. */
  isInitializing: boolean
  /** Called once a Nalanda session already exists (backend already set the
   * refresh cookie and returned an access token) — just updates client
   * state, nothing to persist client-side (docs/Authentication.md §4: the
   * access token is memory-only, the refresh token is an HttpOnly cookie
   * neither this function nor any other client code ever touches). */
  login: (user: AuthUser, accessToken: string) => void
  logout: () => Promise<void>
  /** Patches the in-memory session user without touching tokens — used
   * after an action that changes server-side state the JWT doesn't carry
   * (Step 44: marking `onboardingCompleted` true right after
   * `POST /onboarding/complete` succeeds, without a second `GET /auth/me`
   * round-trip). */
  updateUser: (patch: Partial<AuthUser>) => void
}

/**
 * The raw context object only — no logic, no Provider. Kept separate from
 * `providers/auth-provider.tsx` (which implements the actual session
 * lifecycle) so a consumer only needs the tiny, stable context shape, not
 * the provider's implementation details.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
