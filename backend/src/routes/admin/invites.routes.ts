import { Router } from 'express'

import * as adminInvitesController from '../../controllers/admin/adminInvites.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  createInviteBodySchema,
  inviteIdParamsSchema,
  listInvitesQuerySchema,
} from '../../validators/admin.validator'

const router = Router()

// The entire "register account for new admins" surface is `super_admin`
// only — creating/revoking an admin-role invite is at least as privileged
// as changing an existing user's role (which is already `super_admin`-only
// per Step 52's explicit requirement), so it gets the same restriction.
const superAdminOnly = authorizeRoles('super_admin')

router.post(
  '/',
  superAdminOnly,
  validate({ body: createInviteBodySchema }),
  asyncHandler(adminInvitesController.createInvite),
)

router.get(
  '/',
  superAdminOnly,
  validate({ query: listInvitesQuerySchema }),
  asyncHandler(adminInvitesController.listInvites),
)

router.delete(
  '/:inviteId',
  superAdminOnly,
  validate({ params: inviteIdParamsSchema }),
  asyncHandler(adminInvitesController.revokeInvite),
)

export default router
