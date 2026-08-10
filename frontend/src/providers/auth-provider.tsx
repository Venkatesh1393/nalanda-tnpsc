import { useEffect, useRef, useState, type ReactNode } from 'react'

import { apiClient, setAccessToken, setOnSessionExpired } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import { AuthContext } from '@/context/auth-context'
import { firebaseSignOut } from '@/services/firebaseAuthService'
import type { AuthUser } from '@/types/auth'

/**
 * Real session provider (docs/Authentication.md §1/§4-§5) — no client-side
 * storage of the access token (previously a flagged localStorage/sessionStorage
 * inconsistency, fixed as part of this session's Firebase Authentication
 * step) or the refresh token (an HttpOnly cookie this code never reads
 * directly). On mount, attempts a silent refresh so a page reload restores
 * a real session from the cookie alone, exactly like the flow described in
 * docs/Authentication.md §13's "Silent Refresh" reference.
 *
 * The still-mocked Email OTP path (`services/authService.ts`'s
 * `verifyEmailOtp`) has no real backend behind it, so its session cannot
 * survive a reload the same way — calling `login()` after it still works
 * for the current tab, but a refresh will find no real cookie and end up
 * signed out. That's an accepted, honest consequence of that path staying
 * mocked, not a bug in this provider.
 *
 * The mount effect below guards the actual network call with a ref against
 * React StrictMode's dev-only double effect invocation. This matters here
 * specifically because the refresh token is single-use
 * (docs/Authentication.md §5): two near-simultaneous refresh calls sharing
 * the same not-yet-rotated cookie would have the second call present an
 * already-rotated token, tripping reuse-detection and revoking the whole
 * session family — a real, not just cosmetic, bug for an already logged-in
 * user reloading the page in development. There's deliberately no
 * `cancelled`-style guard around the resulting `setState` calls — this
 * provider is mounted once for the app's entire lifetime, and React 18+
 * already no-ops a `setState` on a truly unmounted component instead of
 * warning, so that extra bookkeeping would only add a way to accidentally
 * suppress the *real* (non-duplicate) request's own state update.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const hasAttemptedRestore = useRef(false)

  useEffect(() => {
    setOnSessionExpired(() => setUser(null))

    async function restoreSession() {
      try {
        const refreshResponse = await apiClient.post<{ data: { accessToken: string } }>(
          endpoints.auth.refresh,
        )
        setAccessToken(refreshResponse.data.data.accessToken)

        const meResponse = await apiClient.get<{ data: AuthUser }>(endpoints.auth.me)
        setUser(meResponse.data.data)
      } catch {
        // No valid refresh cookie (never logged in, expired, or revoked) —
        // this is the ordinary logged-out case, not an error to surface.
        setAccessToken(null)
      } finally {
        setIsInitializing(false)
      }
    }

    if (!hasAttemptedRestore.current) {
      hasAttemptedRestore.current = true
      void restoreSession()
    }

    return () => {
      setOnSessionExpired(null)
    }
  }, [])

  function login(nextUser: AuthUser, accessToken: string) {
    setAccessToken(accessToken)
    setUser(nextUser)
  }

  function updateUser(patch: Partial<AuthUser>) {
    setUser((previous) => (previous ? { ...previous, ...patch } : previous))
  }

  async function logout() {
    try {
      await apiClient.post(endpoints.auth.logout)
    } catch {
      // Best-effort — the user is signed out client-side regardless of
      // whether the backend call itself succeeded.
    }
    await firebaseSignOut().catch(() => {})
    setAccessToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isInitializing,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
