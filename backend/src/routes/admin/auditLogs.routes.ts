import { Router } from 'express'

import * as auditLogController from '../../controllers/admin/auditLog.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import { auditLogQuerySchema } from '../../validators/admin.validator'

const router = Router()

// docs/Authentication.md §7: "View audit logs" is `admin`-only in the
// permission matrix — extended with `super_admin` as a superset of `admin`.
const canViewAuditLogs = authorizeRoles('admin', 'super_admin')

router.get(
  '/',
  canViewAuditLogs,
  validate({ query: auditLogQuerySchema }),
  asyncHandler(auditLogController.getAuditLogs),
)

export default router
