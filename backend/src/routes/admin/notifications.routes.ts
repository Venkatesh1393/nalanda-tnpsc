import { Router } from 'express'

import * as adminNotificationsController from '../../controllers/admin/notifications.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import { broadcastNotificationBodySchema } from '../../validators/notification.validator'

const router = Router()

// docs/Authentication.md §7-style permission matrix — broadcasting to every
// active user is a coarser action than routine content edits, `admin`/
// `super_admin` only (no `content_editor`), same narrowing pattern
// `admin/auditLogs.routes.ts` uses for "View audit logs."
const canBroadcast = authorizeRoles('admin', 'super_admin')

router.post(
  '/broadcast',
  canBroadcast,
  validate({ body: broadcastNotificationBodySchema }),
  asyncHandler(adminNotificationsController.broadcast),
)

export default router
