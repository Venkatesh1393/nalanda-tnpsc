import { Router } from 'express'

import * as adminQuestionPapersController from '../../controllers/admin/adminQuestionPapers.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { uploadQuestionPaperFile } from '../../middleware/upload.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  adminIdParamsSchema,
  createQuestionPaperBodySchema,
  listAdminQuestionPapersQuerySchema,
  updateQuestionPaperBodySchema,
  updateQuestionPaperStatusBodySchema,
} from '../../validators/admin/questionPapers.validator'

/** Previous Year Question Papers admin CRUD + PDF upload. Mounted at
 * `/admin/question-papers` in `routes/admin/index.ts`. */
const router = Router()
const canManageContent = authorizeRoles('content_editor', 'admin', 'super_admin')

router.get(
  '/',
  validate({ query: listAdminQuestionPapersQuerySchema }),
  asyncHandler(adminQuestionPapersController.listQuestionPapers),
)
router.get(
  '/:id',
  validate({ params: adminIdParamsSchema }),
  asyncHandler(adminQuestionPapersController.getQuestionPaper),
)
router.post(
  '/',
  canManageContent,
  validate({ body: createQuestionPaperBodySchema }),
  asyncHandler(adminQuestionPapersController.createQuestionPaper),
)
router.patch(
  '/:id',
  canManageContent,
  validate({ params: adminIdParamsSchema, body: updateQuestionPaperBodySchema }),
  asyncHandler(adminQuestionPapersController.updateQuestionPaper),
)
router.patch(
  '/:id/status',
  canManageContent,
  validate({ params: adminIdParamsSchema, body: updateQuestionPaperStatusBodySchema }),
  asyncHandler(adminQuestionPapersController.updateQuestionPaperStatus),
)
router.post(
  '/:id/file',
  canManageContent,
  validate({ params: adminIdParamsSchema }),
  uploadQuestionPaperFile.single('file'),
  asyncHandler(adminQuestionPapersController.uploadQuestionPaperFile),
)
router.post(
  '/:id/archive',
  canManageContent,
  validate({ params: adminIdParamsSchema }),
  asyncHandler(adminQuestionPapersController.archiveQuestionPaper),
)
router.post(
  '/:id/restore',
  canManageContent,
  validate({ params: adminIdParamsSchema }),
  asyncHandler(adminQuestionPapersController.restoreQuestionPaper),
)

export default router
