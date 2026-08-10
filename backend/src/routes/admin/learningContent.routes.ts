import { Router } from 'express'

import * as adminLearningContentController from '../../controllers/admin/adminLearningContent.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  createLessonBodySchema,
  createStudyMaterialBodySchema,
  idParamsSchema,
  listLessonsQuerySchema,
  listStudyMaterialsQuerySchema,
  updateActiveStatusBodySchema,
  updateLessonBodySchema,
  updateStudyMaterialBodySchema,
} from '../../validators/contentHierarchy.validator'

/**
 * Lesson + StudyMaterial CRUD (Sprint 4 Step 54). Mounted with no path
 * prefix in `routes/admin/index.ts`, so URLs are `/admin/lessons` and
 * `/admin/study-materials` — distinct from the existing public
 * `/study-materials/:studyMaterialId` router (mounted at the top-level
 * `/study-materials`, not under `/admin`), no collision. StudyMaterial's
 * file upload/replace/remove stays on that existing router's
 * `/study-materials/:id/file` routes (Step 50) — reused unchanged, not
 * duplicated here.
 */
const router = Router()
const canManageContent = authorizeRoles('content_editor', 'admin', 'super_admin')

// --- Lesson ---

router.get(
  '/lessons',
  validate({ query: listLessonsQuerySchema }),
  asyncHandler(adminLearningContentController.listLessons),
)
router.get(
  '/lessons/:id',
  validate({ params: idParamsSchema }),
  asyncHandler(adminLearningContentController.getLesson),
)
router.post(
  '/lessons',
  canManageContent,
  validate({ body: createLessonBodySchema }),
  asyncHandler(adminLearningContentController.createLesson),
)
router.patch(
  '/lessons/:id',
  canManageContent,
  validate({ params: idParamsSchema, body: updateLessonBodySchema }),
  asyncHandler(adminLearningContentController.updateLesson),
)
router.patch(
  '/lessons/:id/status',
  canManageContent,
  validate({ params: idParamsSchema, body: updateActiveStatusBodySchema }),
  asyncHandler(adminLearningContentController.updateLessonStatus),
)
router.post(
  '/lessons/:id/archive',
  canManageContent,
  validate({ params: idParamsSchema }),
  asyncHandler(adminLearningContentController.archiveLesson),
)
router.post(
  '/lessons/:id/restore',
  canManageContent,
  validate({ params: idParamsSchema }),
  asyncHandler(adminLearningContentController.restoreLesson),
)

// --- StudyMaterial ---

router.get(
  '/study-materials',
  validate({ query: listStudyMaterialsQuerySchema }),
  asyncHandler(adminLearningContentController.listStudyMaterials),
)
router.get(
  '/study-materials/:id',
  validate({ params: idParamsSchema }),
  asyncHandler(adminLearningContentController.getStudyMaterial),
)
router.post(
  '/study-materials',
  canManageContent,
  validate({ body: createStudyMaterialBodySchema }),
  asyncHandler(adminLearningContentController.createStudyMaterial),
)
router.patch(
  '/study-materials/:id',
  canManageContent,
  validate({ params: idParamsSchema, body: updateStudyMaterialBodySchema }),
  asyncHandler(adminLearningContentController.updateStudyMaterial),
)
router.patch(
  '/study-materials/:id/status',
  canManageContent,
  validate({ params: idParamsSchema, body: updateActiveStatusBodySchema }),
  asyncHandler(adminLearningContentController.updateStudyMaterialStatus),
)
router.post(
  '/study-materials/:id/archive',
  canManageContent,
  validate({ params: idParamsSchema }),
  asyncHandler(adminLearningContentController.archiveStudyMaterial),
)
router.post(
  '/study-materials/:id/restore',
  canManageContent,
  validate({ params: idParamsSchema }),
  asyncHandler(adminLearningContentController.restoreStudyMaterial),
)

export default router
