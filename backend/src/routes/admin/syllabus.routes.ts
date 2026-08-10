import { Router } from 'express'

import * as adminSyllabusController from '../../controllers/admin/adminSyllabus.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  createExamBodySchema,
  createSubjectBodySchema,
  createSubtopicBodySchema,
  createTopicBodySchema,
  idParamsSchema,
  listExamsQuerySchema,
  listSubjectsQuerySchema,
  listSubtopicsQuerySchema,
  listTopicsQuerySchema,
  updateActiveStatusBodySchema,
  updateExamBodySchema,
  updateSubjectBodySchema,
  updateSubtopicBodySchema,
  updateTopicBodySchema,
} from '../../validators/contentHierarchy.validator'

/**
 * Exam → Subject → Topic → Subtopic CRUD (Sprint 4 Step 54). Mounted with no
 * path prefix in `routes/admin/index.ts` (`router.use(syllabusRoutes)`) —
 * every path here is already fully qualified (`/exams`, `/subjects`, ...),
 * so the resulting URLs are `/admin/exams`, `/admin/subjects`, etc.
 *
 * Reads carry no more sensitive data than any other content listing — no
 * further role narrowing beyond the baseline `ADMIN_ACCESS_ROLES` gate
 * already applied one level up. Mutations are `content_editor`/`admin`/
 * `super_admin` only, matching Step 53's `canManageQuestions` precedent.
 */
const router = Router()
const canManageContent = authorizeRoles('content_editor', 'admin', 'super_admin')

// --- Exam ---

router.get(
  '/exams',
  validate({ query: listExamsQuerySchema }),
  asyncHandler(adminSyllabusController.listExams),
)
router.get(
  '/exams/:id',
  validate({ params: idParamsSchema }),
  asyncHandler(adminSyllabusController.getExam),
)
router.post(
  '/exams',
  canManageContent,
  validate({ body: createExamBodySchema }),
  asyncHandler(adminSyllabusController.createExam),
)
router.patch(
  '/exams/:id',
  canManageContent,
  validate({ params: idParamsSchema, body: updateExamBodySchema }),
  asyncHandler(adminSyllabusController.updateExam),
)
router.patch(
  '/exams/:id/status',
  canManageContent,
  validate({ params: idParamsSchema, body: updateActiveStatusBodySchema }),
  asyncHandler(adminSyllabusController.updateExamStatus),
)

// --- Subject ---

router.get(
  '/subjects',
  validate({ query: listSubjectsQuerySchema }),
  asyncHandler(adminSyllabusController.listSubjects),
)
router.get(
  '/subjects/:id',
  validate({ params: idParamsSchema }),
  asyncHandler(adminSyllabusController.getSubject),
)
router.post(
  '/subjects',
  canManageContent,
  validate({ body: createSubjectBodySchema }),
  asyncHandler(adminSyllabusController.createSubject),
)
router.patch(
  '/subjects/:id',
  canManageContent,
  validate({ params: idParamsSchema, body: updateSubjectBodySchema }),
  asyncHandler(adminSyllabusController.updateSubject),
)
router.patch(
  '/subjects/:id/status',
  canManageContent,
  validate({ params: idParamsSchema, body: updateActiveStatusBodySchema }),
  asyncHandler(adminSyllabusController.updateSubjectStatus),
)
router.post(
  '/subjects/:id/archive',
  canManageContent,
  validate({ params: idParamsSchema }),
  asyncHandler(adminSyllabusController.archiveSubject),
)
router.post(
  '/subjects/:id/restore',
  canManageContent,
  validate({ params: idParamsSchema }),
  asyncHandler(adminSyllabusController.restoreSubject),
)

// --- Topic ---

router.get(
  '/topics',
  validate({ query: listTopicsQuerySchema }),
  asyncHandler(adminSyllabusController.listTopics),
)
router.get(
  '/topics/:id',
  validate({ params: idParamsSchema }),
  asyncHandler(adminSyllabusController.getTopic),
)
router.post(
  '/topics',
  canManageContent,
  validate({ body: createTopicBodySchema }),
  asyncHandler(adminSyllabusController.createTopic),
)
router.patch(
  '/topics/:id',
  canManageContent,
  validate({ params: idParamsSchema, body: updateTopicBodySchema }),
  asyncHandler(adminSyllabusController.updateTopic),
)
router.patch(
  '/topics/:id/status',
  canManageContent,
  validate({ params: idParamsSchema, body: updateActiveStatusBodySchema }),
  asyncHandler(adminSyllabusController.updateTopicStatus),
)
router.post(
  '/topics/:id/archive',
  canManageContent,
  validate({ params: idParamsSchema }),
  asyncHandler(adminSyllabusController.archiveTopic),
)
router.post(
  '/topics/:id/restore',
  canManageContent,
  validate({ params: idParamsSchema }),
  asyncHandler(adminSyllabusController.restoreTopic),
)

// --- Subtopic ---

router.get(
  '/subtopics',
  validate({ query: listSubtopicsQuerySchema }),
  asyncHandler(adminSyllabusController.listSubtopics),
)
router.get(
  '/subtopics/:id',
  validate({ params: idParamsSchema }),
  asyncHandler(adminSyllabusController.getSubtopic),
)
router.post(
  '/subtopics',
  canManageContent,
  validate({ body: createSubtopicBodySchema }),
  asyncHandler(adminSyllabusController.createSubtopic),
)
router.patch(
  '/subtopics/:id',
  canManageContent,
  validate({ params: idParamsSchema, body: updateSubtopicBodySchema }),
  asyncHandler(adminSyllabusController.updateSubtopic),
)
router.patch(
  '/subtopics/:id/status',
  canManageContent,
  validate({ params: idParamsSchema, body: updateActiveStatusBodySchema }),
  asyncHandler(adminSyllabusController.updateSubtopicStatus),
)
router.post(
  '/subtopics/:id/archive',
  canManageContent,
  validate({ params: idParamsSchema }),
  asyncHandler(adminSyllabusController.archiveSubtopic),
)
router.post(
  '/subtopics/:id/restore',
  canManageContent,
  validate({ params: idParamsSchema }),
  asyncHandler(adminSyllabusController.restoreSubtopic),
)

export default router
