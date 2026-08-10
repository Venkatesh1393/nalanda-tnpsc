import { Router } from 'express'

import * as adminLiveExamsController from '../../controllers/admin/adminLiveExams.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  createLiveExamBodySchema,
  liveExamIdParamsSchema,
  listLiveExamsQuerySchema,
  updateLiveExamBodySchema,
} from '../../validators/liveExam.validator'

/** Live Exam create/schedule/configure/publish/cancel/publish-results
 * (Sprint 4 Step 54). Mounted at `/admin/live-exams`. */
const router = Router()
const canManageContent = authorizeRoles('content_editor', 'admin', 'super_admin')

router.get(
  '/',
  validate({ query: listLiveExamsQuerySchema }),
  asyncHandler(adminLiveExamsController.listLiveExams),
)
router.get(
  '/:liveExamId',
  validate({ params: liveExamIdParamsSchema }),
  asyncHandler(adminLiveExamsController.getLiveExam),
)
router.post(
  '/',
  canManageContent,
  validate({ body: createLiveExamBodySchema }),
  asyncHandler(adminLiveExamsController.createLiveExam),
)
router.patch(
  '/:liveExamId',
  canManageContent,
  validate({ params: liveExamIdParamsSchema, body: updateLiveExamBodySchema }),
  asyncHandler(adminLiveExamsController.updateLiveExam),
)
router.post(
  '/:liveExamId/publish',
  canManageContent,
  validate({ params: liveExamIdParamsSchema }),
  asyncHandler(adminLiveExamsController.publishLiveExam),
)
router.post(
  '/:liveExamId/cancel',
  canManageContent,
  validate({ params: liveExamIdParamsSchema }),
  asyncHandler(adminLiveExamsController.cancelLiveExam),
)
router.post(
  '/:liveExamId/publish-results',
  canManageContent,
  validate({ params: liveExamIdParamsSchema }),
  asyncHandler(adminLiveExamsController.publishLiveExamResults),
)

export default router
