import { Router } from 'express'

import * as adminDashboardController from '../../controllers/admin/adminDashboard.controller'
import { asyncHandler } from '../../utils/asyncHandler'

const router = Router()

// No further role narrowing beyond the baseline `ADMIN_ACCESS_ROLES` gate
// already applied by `routes/admin/index.ts` — read-only aggregate counts
// carry no sensitive per-user data, so every admin-staff role may view them.
router.get('/', asyncHandler(adminDashboardController.getDashboardStats))

export default router
