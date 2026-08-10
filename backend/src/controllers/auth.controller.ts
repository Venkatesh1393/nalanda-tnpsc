import type { Request, Response } from 'express'

import type { AuthProvider } from '../constants/user'
import { HttpStatus } from '../constants/httpStatus'
import * as authService from '../services/auth.service'
import { ApiError } from '../utils/ApiError'
import {
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
  setRefreshTokenCookie,
} from '../utils/cookies'
import { summarizeDeviceInfo } from '../utils/deviceInfo'
import { sendSuccess } from '../utils/ApiResponse'
import type { UserDocument } from '../models/User.model'

/** The only shape of a `User`(+name) ever sent to a client — never the raw
 * Mongoose document (no `firebaseUid`, no internal fields). */
function toPublicUser(user: UserDocument, name: string, onboardingCompleted: boolean) {
  return {
    id: user.id,
    name,
    email: user.email,
    role: user.role,
    subscriptionTier: user.subscriptionTier,
    onboardingCompleted,
  }
}

async function establishSession(req: Request, res: Response, authProvider: AuthProvider) {
  if (!req.firebaseUser) {
    // Unreachable in practice — verifyFirebaseToken always populates this
    // or throws first — but keeps this function honestly typed.
    throw ApiError.unauthorized()
  }

  const { rememberMe } = req.body as { rememberMe: boolean }
  const deviceInfo = summarizeDeviceInfo(req.headers['user-agent'])

  const { user, profileName, isNewUser, onboardingCompleted, tokens } =
    await authService.establishSessionFromFirebase(
      req.firebaseUser,
      authProvider,
      deviceInfo,
      rememberMe,
    )

  setRefreshTokenCookie(res, tokens.refreshToken, rememberMe)

  sendSuccess(
    res,
    {
      accessToken: tokens.accessToken,
      user: toPublicUser(user, profileName, onboardingCompleted),
      isNewUser,
    },
    isNewUser ? HttpStatus.CREATED : HttpStatus.OK,
  )
}

export async function establishGoogleSession(req: Request, res: Response): Promise<void> {
  await establishSession(req, res, 'google')
}

export async function establishEmailSession(req: Request, res: Response): Promise<void> {
  await establishSession(req, res, 'email_password')
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const rawRefreshToken = readRefreshTokenCookie(req.cookies)
  if (!rawRefreshToken) {
    throw ApiError.unauthorized('No active session found. Please sign in again.')
  }

  const deviceInfo = summarizeDeviceInfo(req.headers['user-agent'])
  const tokens = await authService.refreshSession(rawRefreshToken, deviceInfo)

  setRefreshTokenCookie(res, tokens.refreshToken, tokens.rememberMe)
  sendSuccess(res, { accessToken: tokens.accessToken })
}

export async function logout(req: Request, res: Response): Promise<void> {
  const rawRefreshToken = readRefreshTokenCookie(req.cookies)
  if (rawRefreshToken) {
    await authService.logout(rawRefreshToken)
  }
  clearRefreshTokenCookie(res)
  sendSuccess(res, { loggedOut: true })
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()

  const sessionsRevoked = await authService.logoutAll(req.user.sub)
  clearRefreshTokenCookie(res)
  sendSuccess(res, { sessionsRevoked })
}

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { user, profileName, onboardingCompleted } = await authService.getCurrentUser(
    req.user.sub,
  )
  sendSuccess(res, toPublicUser(user, profileName, onboardingCompleted))
}
