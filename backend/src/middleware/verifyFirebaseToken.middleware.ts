import type { NextFunction, Request, Response } from 'express'

import { verifyFirebaseIdToken } from '../config/firebase'
import { ApiError } from '../utils/ApiError'
import { asyncHandler } from '../utils/asyncHandler'

/**
 * Verifies a Firebase ID token sent in the request body (`{ firebaseIdToken }`,
 * per `docs/API.md` §1's `POST /auth/google` shape — the same shape this
 * step reuses for `POST /auth/email`) and attaches the decoded claims to
 * `req.firebaseUser`. Distinct from `middleware/auth.middleware.ts`'s
 * `authenticate`, which verifies Nalanda's own JWT from the `Authorization`
 * header — this one only runs on the handful of routes that establish a
 * session from a Firebase credential in the first place.
 */
export const verifyFirebaseToken = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const { firebaseIdToken } = req.body as { firebaseIdToken?: unknown }

    if (typeof firebaseIdToken !== 'string' || firebaseIdToken.length === 0) {
      throw ApiError.badRequest('firebaseIdToken is required')
    }

    req.firebaseUser = await verifyFirebaseIdToken(firebaseIdToken)
    next()
  },
)
