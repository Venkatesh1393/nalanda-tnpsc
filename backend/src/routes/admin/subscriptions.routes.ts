import { Router } from 'express'

import * as adminSubscriptionsController from '../../controllers/admin/adminSubscriptions.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  listSubscriptionsQuerySchema,
  userIdParamsSchema,
} from '../../validators/admin.validator'

/**
 * Sprint 4 Step 55 — read-only, same viewer set as User Management
 * (`admin`/`support`/`super_admin`, docs/Authentication.md §7). No mutation
 * route exists in this file, by design (Step 55's "do not allow unsafe
 * manual payment manipulation" instruction) — an admin can inspect a
 * subscription's state but cannot grant, revoke, or refund one from here.
 */
const router = Router()

const canViewSubscriptions = authorizeRoles('admin', 'support', 'super_admin')

router.get(
  '/',
  canViewSubscriptions,
  validate({ query: listSubscriptionsQuerySchema }),
  asyncHandler(adminSubscriptionsController.listSubscriptions),
)

router.get(
  '/:userId',
  canViewSubscriptions,
  validate({ params: userIdParamsSchema }),
  asyncHandler(adminSubscriptionsController.getSubscription),
)

export default router
