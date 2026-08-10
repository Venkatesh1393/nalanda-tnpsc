import { Router } from 'express'

import * as lessonController from '../controllers/lesson.controller'
import { authenticate } from '../middleware/auth.middleware'
import { authorizeRoles } from '../middleware/rbac.middleware'
import { uploadStudyMaterialFile } from '../middleware/upload.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// content_editor/admin/super_admin only — Sprint 3 Step 50's Cloudinary file
// attach/detach, distinct from the student-facing GET below. Reused
// unchanged by Step 54's admin Study Material CRUD, which only adds the
// plain-metadata record lifecycle at `/admin/study-materials/*`.
router.post(
  '/:studyMaterialId/file',
  authenticate,
  authorizeRoles('content_editor', 'admin', 'super_admin'),
  uploadStudyMaterialFile.single('file'),
  asyncHandler(lessonController.uploadStudyMaterialFile),
)

router.delete(
  '/:studyMaterialId/file',
  authenticate,
  authorizeRoles('content_editor', 'admin', 'super_admin'),
  asyncHandler(lessonController.deleteStudyMaterialFile),
)

router.get(
  '/:studyMaterialId',
  authenticate,
  asyncHandler(lessonController.getStudyMaterialById),
)

export default router
