import type { Response } from 'express'

import { env, isProduction } from '../config/env'

const REFRESH_TOKEN_COOKIE = 'refreshToken'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// Scoped to just the auth routes that ever need to read it — the browser
// never attaches this cookie to, say, a /questions request.
const COOKIE_PATH = `/api/${env.API_VERSION}/auth`

/**
 * Sets the refresh-token cookie per docs/Authentication.md §5/§9 — HttpOnly
 * + SameSite=Strict always; `Secure` in production only (a plain-HTTP local
 * dev server can't set a `Secure` cookie the browser will actually store).
 * `rememberMe: false` omits `maxAge` entirely, producing a session cookie
 * that dies when the browser fully closes, per §9's "Off" behavior.
 */
export function setRefreshTokenCookie(
  res: Response,
  token: string,
  rememberMe: boolean,
): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: COOKIE_PATH,
    ...(rememberMe && { maxAge: THIRTY_DAYS_MS }),
  })
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: COOKIE_PATH,
  })
}

export function readRefreshTokenCookie(
  cookies: Record<string, unknown>,
): string | undefined {
  const value = cookies[REFRESH_TOKEN_COOKIE]
  return typeof value === 'string' ? value : undefined
}
