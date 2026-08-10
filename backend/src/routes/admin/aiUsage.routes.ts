import { Router } from 'express'

import * as adminAiUsageController from '../../controllers/admin/adminAiUsage.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import { aiUsageDashboardQuerySchema } from '../../validators/admin.validator'

/**
 * Sprint 4 Step 58 — read-only AI usage/cost visibility, same viewer set as
 * Payments (`admin`/`support`/`super_admin`) since cost figures are
 * financial-adjacent data. No mutation route — this is observability only.
 */
const router = Router()

const canViewAiUsage = authorizeRoles('admin', 'support', 'super_admin')

router.get(
  '/',
  canViewAiUsage,
  validate({ query: aiUsageDashboardQuerySchema }),
  asyncHandler(adminAiUsageController.getUsageDashboard),
)

export default router
