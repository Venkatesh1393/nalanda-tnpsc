import { Router } from 'express'

import * as adminUsersController from '../../controllers/admin/adminUsers.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  listUsersQuerySchema,
  updateUserRoleBodySchema,
  updateUserStatusBodySchema,
  userIdParamsSchema,
} from '../../validators/admin.validator'

const router = Router()

// docs/Authentication.md §7's permission matrix: user listing/viewing is
// `admin`/`support` today, extended with `super_admin` (a superset of
// `admin`'s own privileges) — `moderator`/`content_editor` can enter the
// Admin Panel shell (routes/admin/index.ts's baseline gate) but have no
// business reading the full user directory.
const canViewUsers = authorizeRoles('admin', 'support', 'super_admin')
// Status changes (suspend/reactivate) — `admin`/`moderator`/`super_admin`
// per the same doc's table.
const canUpdateStatus = authorizeRoles('admin', 'moderator', 'super_admin')
// Role changes are the single highest-privilege action in this module —
// Step 52's explicit "only super_admin" requirement.
const canUpdateRole = authorizeRoles('super_admin')

router.get(
  '/',
  canViewUsers,
  validate({ query: listUsersQuerySchema }),
  asyncHandler(adminUsersController.listUsers),
)

router.get(
  '/:userId',
  canViewUsers,
  validate({ params: userIdParamsSchema }),
  asyncHandler(adminUsersController.getUser),
)

router.patch(
  '/:userId/status',
  canUpdateStatus,
  validate({ params: userIdParamsSchema, body: updateUserStatusBodySchema }),
  asyncHandler(adminUsersController.updateUserStatus),
)

router.patch(
  '/:userId/role',
  canUpdateRole,
  validate({ params: userIdParamsSchema, body: updateUserRoleBodySchema }),
  asyncHandler(adminUsersController.updateUserRole),
)

export default router
