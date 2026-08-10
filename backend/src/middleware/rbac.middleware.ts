import type { NextFunction, Request, Response } from 'express'

import type { Role, SubscriptionTier } from '../constants/roles'
import { ApiError } from '../utils/ApiError'

/**
 * Authorizes by role only — mount after `authenticate`. Kept in its own
 * file/function, distinct from `authorizeTiers`, per docs/Authentication.md
 * §6's "two separate JWT claims, two separate middleware checks, always."
 */
export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized())
      return
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(ApiError.forbidden())
      return
    }
    next()
  }
}

/** Authorizes by subscription tier only — never combined with role checks. */
export function authorizeTiers(...allowedTiers: SubscriptionTier[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized())
      return
    }
    if (!allowedTiers.includes(req.user.subscriptionTier)) {
      next(
        ApiError.forbidden(
          'Your current subscription plan does not include this feature',
        ),
      )
      return
    }
    next()
  }
}
