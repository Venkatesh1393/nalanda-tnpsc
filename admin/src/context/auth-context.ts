import { createContext } from 'react'

import type { AuthUser } from '@/types/auth'

export type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (user: AuthUser, accessToken: string) => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
