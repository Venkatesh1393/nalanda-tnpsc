import axios from 'axios'

import { env } from '@/lib/env'
import { endpoints } from './endpoints'

/**
 * The one Axios instance in this app — mirrors frontend/src/api/client.ts's
 * pattern exactly (same backend, same cookie-based refresh mechanics,
 * docs/Authentication.md §4-§5), since this app talks to the same auth
 * endpoints, just with a different allowed-role set enforced server-side.
 */
export const apiClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: true,
})

/** In-memory only, never localStorage/sessionStorage — same XSS-mitigation
 * rationale as the student app (docs/Authentication.md §4). */
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

let onSessionExpired: (() => void) | null = null

export function setOnSessionExpired(callback: (() => void) | null): void {
  onSessionExpired = callback
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let pendingRefresh: Promise<string | null> | null = null

/** Same single-flight guard as the student app — several requests can 401
 * in quick succession right as a token expires, and they must all wait on
 * the same refresh rather than each triggering their own (which would race
 * the single-use refresh-token rotation, docs/Authentication.md §5). */
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
