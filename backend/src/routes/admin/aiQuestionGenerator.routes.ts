import { Router } from 'express'

import * as adminAiQuestionGeneratorController from '../../controllers/admin/adminAiQuestionGenerator.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  draftIdParamsSchema,
  generateQuestionsBodySchema,
  listDraftsQuerySchema,
  rejectDraftBodySchema,
  updateDraftBodySchema,
} from '../../validators/admin/aiQuestionGenerator.validator'

/**
 * Sprint 4 Step 65 — Admin AI Question Generator. Read endpoints (list/get
 * the review queue) carry no more sensitive data than the question bank
 * listing itself — no further role narrowing beyond the baseline admin-staff
 * gate (`routes/admin/index.ts`), same reasoning `questions.routes.ts`
 * documents. Every mutation — generating new drafts, editing one, and above
 * all approving/rejecting — is restricted to `content_editor`/`admin`/
 * `super_admin`, the exact same set allowed to mutate the real question bank.
 */
const router = Router()

const canManageQuestions = authorizeRoles('content_editor', 'admin', 'super_admin')

router.post(
  '/generate',
  canManageQuestions,
  validate({ body: generateQuestionsBodySchema }),
  asyncHandler(adminAiQuestionGeneratorController.generateQuestions),
)

router.get(
  '/',
  validate({ query: listDraftsQuerySchema }),
  asyncHandler(adminAiQuestionGeneratorController.listDrafts),
)
router.get(
  '/:id',
  validate({ params: draftIdParamsSchema }),
  asyncHandler(adminAiQuestionGeneratorController.getDraft),
)
router.patch(
  '/:id',
  canManageQuestions,
  validate({ params: draftIdParamsSchema, body: updateDraftBodySchema }),
  asyncHandler(adminAiQuestionGeneratorController.updateDraft),
)
router.post(
  '/:id/approve',
  canManageQuestions,
  validate({ params: draftIdParamsSchema }),
  asyncHandler(adminAiQuestionGeneratorController.approveDraft),
)
router.post(
  '/:id/reject',
  canManageQuestions,
  validate({ params: draftIdParamsSchema, body: rejectDraftBodySchema }),
  asyncHandler(adminAiQuestionGeneratorController.rejectDraft),
)

export default router
