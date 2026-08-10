import { useEffect, useRef, useState, type ReactNode } from 'react'

import { apiClient, setAccessToken, setOnSessionExpired } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import { AuthContext } from '@/context/auth-context'
import { firebaseSignOut } from '@/services/firebaseAuthService'
import type { AuthUser } from '@/types/auth'

/**
 * Real session provider — mirrors frontend/src/providers/auth-provider.tsx's
 * silent-refresh-on-mount pattern exactly, including the StrictMode
 * double-effect guard (see that file's header comment for the full
 * reasoning: the refresh token is single-use, so a duplicate near-
 * simultaneous refresh call would spuriously trip reuse-detection and log
 * an already-logged-in admin back out on a dev-mode page reload).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const hasAttemptedRestore = useRef(false)

  useEffect(() => {
    setOnSessionExpired(() => setUser(null))

    async function restoreSession() {
      try {
        const refreshResponse = await apiClient.post<{
          data: { accessToken: string }
        }>(endpoints.auth.refresh)
        setAccessToken(refreshResponse.data.data.accessToken)

        const meResponse = await apiClient.get<{ data: AuthUser }>(endpoints.auth.me)
        setUser(meResponse.data.data)
      } catch {
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

  async function logout() {
    try {
      await apiClient.post(endpoints.auth.logout)
    } catch {
      // Best-effort — signed out client-side regardless.
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
