import { Router } from 'express'

import * as currentAffairsController from '../controllers/currentAffairs.controller'
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware'
import { authorizeRoles } from '../middleware/rbac.middleware'
import { uploadContentImage } from '../middleware/upload.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import {
  archiveMonthParamsSchema,
  idParamsSchema,
  listQuerySchema,
  previewQuerySchema,
  searchQuerySchema,
} from '../validators/currentAffairs.validator'

const router = Router()

// `optionalAuthenticate` everywhere — every read here is public (unauthenticated
// preview/list/detail per docs/API.md §13), but an authenticated caller
// additionally gets `isBookmarked` per item. Static paths (`/preview`,
// `/search`, `/archive/*`) are registered before the dynamic `/:id` routes,
// same Express-declaration-order reason Practice's `/history` and Live
// Exams' `/attempts` routes both needed.

router.get(
  '/preview',
  optionalAuthenticate,
  validate({ query: previewQuerySchema }),
  asyncHandler(currentAffairsController.getPreview),
)

router.get(
  '/search',
  optionalAuthenticate,
  validate({ query: searchQuerySchema }),
  asyncHandler(currentAffairsController.search),
)

router.get(
  '/archive/months',
  optionalAuthenticate,
  asyncHandler(currentAffairsController.getArchiveMonths),
)

router.get(
  '/archive/:month',
  optionalAuthenticate,
  validate({ params: archiveMonthParamsSchema }),
  asyncHandler(currentAffairsController.getArchiveForMonth),
)

router.get(
  '/',
  optionalAuthenticate,
  validate({ query: listQuerySchema }),
  asyncHandler(currentAffairsController.getList),
)

router.get(
  '/:id/quiz',
  optionalAuthenticate,
  validate({ params: idParamsSchema }),
  asyncHandler(currentAffairsController.getQuiz),
)

router.get(
  '/:id/related-questions',
  optionalAuthenticate,
  validate({ params: idParamsSchema }),
  asyncHandler(currentAffairsController.getRelatedQuestions),
)

// Sprint 4 Step 61 (Gamification System) — authenticated only (unlike every
// read route above): marking an article read is a real per-user, XP-earning
// write, not a public read.
router.post(
  '/:id/read',
  authenticate,
  validate({ params: idParamsSchema }),
  asyncHandler(currentAffairsController.markAsRead),
)

// content_editor/admin only — Sprint 3 Step 50's Cloudinary image
// attach/detach, distinct from every read route above.
router.post(
  '/:id/image',
  authenticate,
  authorizeRoles('content_editor', 'admin', 'super_admin'),
  validate({ params: idParamsSchema }),
  uploadContentImage.single('image'),
  asyncHandler(currentAffairsController.uploadImage),
)

router.delete(
  '/:id/image',
  authenticate,
  authorizeRoles('content_editor', 'admin', 'super_admin'),
  validate({ params: idParamsSchema }),
  asyncHandler(currentAffairsController.deleteImage),
)

router.get(
  '/:id',
  optionalAuthenticate,
  validate({ params: idParamsSchema }),
  asyncHandler(currentAffairsController.getDetail),
)

export default router
