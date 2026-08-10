import { Router } from 'express'

import * as adminCurrentAffairsController from '../../controllers/admin/adminCurrentAffairs.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  adminIdParamsSchema,
  createCurrentAffairBodySchema,
  listAdminCurrentAffairsQuerySchema,
  updateCurrentAffairBodySchema,
  updateCurrentAffairStatusBodySchema,
} from '../../validators/currentAffairs.validator'

/** Current Affairs CRUD + schedule/publish/unpublish (Sprint 4 Step 54).
 * Image attach/replace/remove stays on the existing
 * `/current-affairs/:id/image` routes (Step 50, public router) — reused
 * unchanged. Mounted at `/admin/current-affairs` in `routes/admin/index.ts`. */
const router = Router()
const canManageContent = authorizeRoles('content_editor', 'admin', 'super_admin')

router.get(
  '/',
  validate({ query: listAdminCurrentAffairsQuerySchema }),
  asyncHandler(adminCurrentAffairsController.listCurrentAffairs),
)
router.get(
  '/:id',
  validate({ params: adminIdParamsSchema }),
  asyncHandler(adminCurrentAffairsController.getCurrentAffair),
)
router.post(
  '/',
  canManageContent,
  validate({ body: createCurrentAffairBodySchema }),
  asyncHandler(adminCurrentAffairsController.createCurrentAffair),
)
router.patch(
  '/:id',
  canManageContent,
  validate({ params: adminIdParamsSchema, body: updateCurrentAffairBodySchema }),
  asyncHandler(adminCurrentAffairsController.updateCurrentAffair),
)
router.patch(
  '/:id/status',
  canManageContent,
  validate({ params: adminIdParamsSchema, body: updateCurrentAffairStatusBodySchema }),
  asyncHandler(adminCurrentAffairsController.updateCurrentAffairStatus),
)
router.post(
  '/:id/archive',
  canManageContent,
  validate({ params: adminIdParamsSchema }),
  asyncHandler(adminCurrentAffairsController.archiveCurrentAffair),
)
router.post(
  '/:id/restore',
  canManageContent,
  validate({ params: adminIdParamsSchema }),
  asyncHandler(adminCurrentAffairsController.restoreCurrentAffair),
)

export default router
