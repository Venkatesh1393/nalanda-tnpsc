import { Router } from 'express'

import * as adminQuestionsController from '../../controllers/admin/adminQuestions.controller'
import * as questionImportController from '../../controllers/admin/questionImport.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import {
  uploadBulkImportFile,
  uploadPdfMetadataFile,
} from '../../middleware/upload.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  bulkDeleteBodySchema,
  bulkUpdateBodySchema,
  bulkUpdatePreviewBodySchema,
  createQuestionBodySchema,
  importConfirmBodySchema,
  importTemplateQuerySchema,
  listMetaSubjectsQuerySchema,
  listMetaSubtopicsQuerySchema,
  listMetaTopicsQuerySchema,
  listQuestionsQuerySchema,
  questionIdParamsSchema,
  requestChangesBodySchema,
  updateQuestionBodySchema,
  updateQuestionStatusBodySchema,
  versionParamsSchema,
} from '../../validators/question.validator'

const router = Router()

// Read-only endpoints carry no more sensitive data than any other content
// listing — no further role narrowing beyond the baseline `ADMIN_ACCESS_ROLES`
// gate already applied by `routes/admin/index.ts` (same reasoning as
// `admin/dashboard.routes.ts`). Mutations (including Bulk Import, since it
// writes just as much content as the create endpoint) are restricted to
// `content_editor`/`admin`/`super_admin` — `moderator`/`support` may view the
// question bank but never edit it.
const canManageQuestions = authorizeRoles('content_editor', 'admin', 'super_admin')

// Sprint 4 Step 71.5 — Content Workflow. `moderator` gets its first real
// write path on Questions here, deliberately narrow: it may review/gate
// content (approve or request changes) but still can't touch content
// fields directly (`canManageQuestions` above is unchanged). `admin`+ only
// for the final "Admin Approval -> Published" step.
const canReviewQuestions = authorizeRoles('moderator', 'admin', 'super_admin')
const canPublishQuestions = authorizeRoles('admin', 'super_admin')

router.get(
  '/',
  validate({ query: listQuestionsQuerySchema }),
  asyncHandler(adminQuestionsController.listQuestions),
)
router.get(
  '/:id',
  validate({ params: questionIdParamsSchema }),
  asyncHandler(adminQuestionsController.getQuestion),
)

router.post(
  '/',
  canManageQuestions,
  validate({ body: createQuestionBodySchema }),
  asyncHandler(adminQuestionsController.createQuestion),
)
router.patch(
  '/:id',
  canManageQuestions,
  validate({ params: questionIdParamsSchema, body: updateQuestionBodySchema }),
  asyncHandler(adminQuestionsController.updateQuestion),
)
router.patch(
  '/:id/status',
  canManageQuestions,
  validate({ params: questionIdParamsSchema, body: updateQuestionStatusBodySchema }),
  asyncHandler(adminQuestionsController.updateQuestionStatus),
)
router.post(
  '/:id/archive',
  canManageQuestions,
  validate({ params: questionIdParamsSchema }),
  asyncHandler(adminQuestionsController.archiveQuestion),
)
router.post(
  '/:id/restore',
  canManageQuestions,
  validate({ params: questionIdParamsSchema }),
  asyncHandler(adminQuestionsController.restoreQuestion),
)

// --- Content Workflow (Sprint 4 Step 71.5) --------------------------------
router.post(
  '/:id/submit-for-review',
  canManageQuestions,
  validate({ params: questionIdParamsSchema }),
  asyncHandler(adminQuestionsController.submitForReview),
)
router.post(
  '/:id/approve',
  canReviewQuestions,
  validate({ params: questionIdParamsSchema }),
  asyncHandler(adminQuestionsController.approveQuestion),
)
router.post(
  '/:id/request-changes',
  canReviewQuestions,
  validate({ params: questionIdParamsSchema, body: requestChangesBodySchema }),
  asyncHandler(adminQuestionsController.requestChanges),
)
router.post(
  '/:id/publish',
  canPublishQuestions,
  validate({ params: questionIdParamsSchema }),
  asyncHandler(adminQuestionsController.publishQuestion),
)

// --- Version History (Sprint 4 Step 71.5) ---------------------------------
// Reads carry the baseline admin gate only, same reasoning as the question
// list/detail reads above. Rollback is a content mutation, gated the same
// as any other content edit.
router.get(
  '/:id/versions',
  validate({ params: questionIdParamsSchema }),
  asyncHandler(adminQuestionsController.listVersions),
)
router.get(
  '/:id/versions/:versionNumber',
  validate({ params: versionParamsSchema }),
  asyncHandler(adminQuestionsController.getVersion),
)
router.post(
  '/:id/versions/:versionNumber/rollback',
  canManageQuestions,
  validate({ params: versionParamsSchema }),
  asyncHandler(adminQuestionsController.rollback),
)

// --- Bulk Update / Bulk Delete (Sprint 4 Step 71.5) -----------------------
router.post(
  '/bulk-update/preview',
  canManageQuestions,
  validate({ body: bulkUpdatePreviewBodySchema }),
  asyncHandler(adminQuestionsController.bulkUpdatePreview),
)
router.post(
  '/bulk-update',
  canManageQuestions,
  validate({ body: bulkUpdateBodySchema }),
  asyncHandler(adminQuestionsController.bulkUpdate),
)
router.post(
  '/bulk-delete',
  canManageQuestions,
  validate({ body: bulkDeleteBodySchema }),
  asyncHandler(adminQuestionsController.bulkDelete),
)

router.get('/meta/exams', asyncHandler(adminQuestionsController.listMetaExams))
router.get(
  '/meta/subjects',
  validate({ query: listMetaSubjectsQuerySchema }),
  asyncHandler(adminQuestionsController.listMetaSubjects),
)
router.get(
  '/meta/topics',
  validate({ query: listMetaTopicsQuerySchema }),
  asyncHandler(adminQuestionsController.listMetaTopics),
)
router.get(
  '/meta/subtopics',
  validate({ query: listMetaSubtopicsQuerySchema }),
  asyncHandler(adminQuestionsController.listMetaSubtopics),
)

// --- Bulk Import (Sprint 4 Step 53) ---------------------------------------
//
// Deliberately stateless request/response, no job queue or server-side
// staging area (this project's established "no background-job scheduler
// exists yet" precedent — see Analytics/Leaderboard). `POST /import/confirm`
// re-uploads and re-parses the *same* file the client just previewed rather
// than trusting a client-held JSON blob of "resolved" rows back — the only
// thing that round-trips is `rowNumbers`, a plain array of which rows to
// commit, so a tampered client payload can never inject unvalidated content.
router.get(
  '/import/template',
  canManageQuestions,
  validate({ query: importTemplateQuerySchema }),
  asyncHandler(questionImportController.downloadTemplate),
)
router.post(
  '/import/preview',
  canManageQuestions,
  uploadBulkImportFile.single('file'),
  asyncHandler(questionImportController.previewImport),
)
router.post(
  '/import/confirm',
  canManageQuestions,
  uploadBulkImportFile.single('file'),
  validate({ body: importConfirmBodySchema }),
  asyncHandler(questionImportController.confirmImportHandler),
)
// Sprint 4 Step 71.5 — PDF metadata extraction only (confirmed scope: never
// question-text parsing from PDF pages). A read-only assistive utility, not
// part of the parse/preview/confirm pipeline above.
router.post(
  '/import/pdf-metadata',
  canManageQuestions,
  uploadPdfMetadataFile.single('file'),
  asyncHandler(questionImportController.extractPdfMetadata),
)

export default router
