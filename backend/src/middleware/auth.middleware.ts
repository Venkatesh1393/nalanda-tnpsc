import type { NextFunction, Request, Response } from 'express'
import { TokenExpiredError } from 'jsonwebtoken'

import { ApiError } from '../utils/ApiError'
import { verifyAccessToken } from '../utils/jwt'

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return undefined
  return header.slice('Bearer '.length).trim() || undefined
}

/**
 * Verifies the Nalanda-issued access token (never a raw Firebase token, per
 * docs/Authentication.md §4) and attaches its claims to `req.user`. Mount on
 * any route that requires a signed-in user; combine with
 * rbac.middleware.ts's `authorizeRoles`/`authorizeTiers` for role/tier gates
 * — this middleware only proves *who*, never *what they're allowed to do*.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req)

  if (!token) {
    next(ApiError.unauthorized('Missing or malformed Authorization header'))
    return
  }

  try {
    req.user = verifyAccessToken(token)
    next()
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      next(ApiError.unauthorized('Access token has expired'))
      return
    }
    next(ApiError.unauthorized('Invalid access token'))
  }
}

/**
 * Same verification as `authenticate`, but never rejects a request for
 * missing/invalid credentials — used by routes that behave differently for
 * signed-in vs. anonymous callers (e.g. public marketing endpoints that
 * personalize slightly when a valid token is present) without requiring one.
 */
export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractBearerToken(req)
  if (!token) {
    next()
    return
  }

  try {
    req.user = verifyAccessToken(token)
  } catch {
    // Deliberately silent — an invalid/expired token on an optional-auth
    // route just means "treat this caller as anonymous," not an error.
  }
  next()
}
