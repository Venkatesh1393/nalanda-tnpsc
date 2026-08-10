import { Router } from 'express'

import * as questionController from '../controllers/question.controller'
import { authenticate } from '../middleware/auth.middleware'
import { authorizeRoles } from '../middleware/rbac.middleware'
import { uploadContentImage } from '../middleware/upload.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import { idParamsSchema } from '../validators/question.validator'

/**
 * `Question` media only (Sprint 3 Step 50) — full admin CRUD for questions
 * lives separately at `/admin/questions/*` (Sprint 4 Step 53), which reuses
 * these two image endpoints unchanged rather than duplicating them.
 * `content_editor`/`admin`/`super_admin` only, never a plain `user`.
 */
const router = Router()

router.post(
  '/:id/image',
  authenticate,
  authorizeRoles('content_editor', 'admin', 'super_admin'),
  validate({ params: idParamsSchema }),
  uploadContentImage.single('image'),
  asyncHandler(questionController.uploadImage),
)

router.delete(
  '/:id/image',
  authenticate,
  authorizeRoles('content_editor', 'admin', 'super_admin'),
  validate({ params: idParamsSchema }),
  asyncHandler(questionController.deleteImage),
)

export default router
