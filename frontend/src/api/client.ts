import axios from 'axios'

import { env } from '@/lib/env'
import { endpoints } from './endpoints'

/**
 * Shared Axios instance — the one place in the app that constructs an HTTP
 * client. Every module in `services/` (and every feature-local service
 * function) builds on this, never a fresh `axios.create()` of its own.
 * Every response follows the { success, data, error, meta } envelope from
 * docs/API.md §0.
 */
export const apiClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  // The refresh token is an HttpOnly cookie (docs/Authentication.md §5) —
  // it's never readable by JS, but the browser still needs to send it.
  withCredentials: true,
})

/**
 * The short-lived access token is held in memory only (docs/Authentication.md
 * §4 — never localStorage/sessionStorage, to reduce XSS token-theft impact).
 * `providers/auth-provider.tsx` calls `setAccessToken` after login, after
 * each silent refresh below, and with `null` on logout.
 */
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

/**
 * Registered by `AuthProvider` so this module can announce "the session is
 * unrecoverable" (refresh itself failed) without importing React context
 * here — keeps this file a plain transport module, no UI-layer dependency.
 */
let onSessionExpired: (() => void) | null = null

export function setOnSessionExpired(callback: (() => void) | null): void {
  onSessionExpired = callback
}

/**
 * `LanguageProvider` calls `setApiLanguage` on every language change (and
 * once on mount) so every outgoing request carries the current `lang`
 * query param — same "announce state into this plain module without
 * importing React context here" pattern as `setAccessToken` above. The
 * backend (`backend/src/utils/language.ts`'s `resolveDisplayLanguage`)
 * only ever reads a `lang` query param, never a header.
 */
let apiLanguage: 'en' | 'ta' = 'en'

export function setApiLanguage(language: 'en' | 'ta'): void {
  apiLanguage = language
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  // `lang` first, existing params spread after — lets a call site that ever
  // needs an explicit override still win.
  config.params = { lang: apiLanguage, ...config.params }
  return config
})

let pendingRefresh: Promise<string | null> | null = null

/** Ensures only one `/auth/refresh` call is ever in flight at a time —
 * several requests can 401 in quick succession right as a token expires,
 * and they should all wait on the same refresh rather than each triggering
 * their own (which would race the single-use refresh-token rotation,
 * docs/Authentication.md §5, and spuriously trip reuse detection). */
function refreshAccessToken(): Promise<string | null> {
  pendingRefresh ??= apiClient
    .post<{ data: { accessToken: string } }>(endpoints.auth.refresh)
    .then((response) => {
      const newToken = response.data.data.accessToken
      setAccessToken(newToken)
      return newToken
    })
    .catch(() => {
      setAccessToken(null)
      onSessionExpired?.()
      return null
    })
    .finally(() => {
      pendingRefresh = null
    })

  return pendingRefresh
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error)
    }

    const isRefreshCall = error.config.url?.includes(endpoints.auth.refresh)
    const alreadyRetried = (error.config as { _retried?: boolean })._retried

    if (error.response?.status !== 401 || isRefreshCall || alreadyRetried) {
      return Promise.reject(error)
    }

    const newToken = await refreshAccessToken()
    if (!newToken) {
      return Promise.reject(error)
    }

    ;(error.config as { _retried?: boolean })._retried = true
    error.config.headers.Authorization = `Bearer ${newToken}`
    return apiClient(error.config)
  },
)
