import { Router } from 'express'

import * as adminMonitoringController from '../../controllers/admin/adminMonitoring.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  listSystemEventsQuerySchema,
  statsWindowQuerySchema,
} from '../../validators/admin.validator'

/**
 * Sprint 4 Step 74 — Production Monitoring. Read-only, same viewer set as
 * Payments/AI Usage (`admin`/`support`/`super_admin`) — operational events
 * are exactly the kind of thing support staff diagnosing a user report
 * benefit from seeing, same reasoning as those two. No mutation route —
 * `SystemEvent` rows expire on their own via the model's TTL index.
 */
const router = Router()

const canViewMonitoring = authorizeRoles('admin', 'support', 'super_admin')

router.get(
  '/events',
  canViewMonitoring,
  validate({ query: listSystemEventsQuerySchema }),
  asyncHandler(adminMonitoringController.listEvents),
)

router.get(
  '/summary',
  canViewMonitoring,
  validate({ query: statsWindowQuerySchema }),
  asyncHandler(adminMonitoringController.getSummary),
)

export default router
