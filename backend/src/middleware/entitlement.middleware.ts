import type { NextFunction, Request, Response } from 'express'

import type { FeatureKey } from '../constants/entitlements'
import { hasFeature } from '../services/entitlement.service'
import { ApiError } from '../utils/ApiError'

/**
 * Route-level entitlement gate — mount after `authenticate`, distinct from
 * `authorizeRoles`/`authorizeTiers` (`middleware/rbac.middleware.ts`) since a
 * feature gate is a plan-driven decision (`config/plans.config.ts`), not a
 * raw tier or role check. Ready for the first hard-gated endpoint that needs
 * it (e.g. an AI Tutor route) — services that only need to *know* the
 * boolean to shape a DTO (like `practice.service.ts#getReview`'s AI
 * Explanation "locked" state) call `hasFeature`/`getEntitlements`
 * (`services/entitlement.service.ts`) directly instead.
 */
export function requireFeature(feature: FeatureKey) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized())
      return
    }
    if (!hasFeature(req.user.subscriptionTier, feature)) {
      next(
        ApiError.forbidden(
          'Your current plan does not include this feature. Upgrade to unlock it.',
        ),
      )
      return
    }
    next()
  }
}
