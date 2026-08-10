import { Router } from 'express'

import * as learnController from '../controllers/learn.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import { subjectsQuerySchema } from '../validators/learn.validator'

const router = Router()

router.get(
  '/',
  authenticate,
  validate({ query: subjectsQuerySchema }),
  asyncHandler(learnController.getSubjects),
)

router.get('/:subjectSlug', authenticate, asyncHandler(learnController.getSubject))
router.get('/:subjectSlug/topics', authenticate, asyncHandler(learnController.getTopics))
router.get(
  '/:subjectSlug/topics/:topicSlug/subtopics',
  authenticate,
  asyncHandler(learnController.getSubtopics),
)
router.get(
  '/:subjectSlug/topics/:topicSlug/subtopics/:subtopicSlug',
  authenticate,
  asyncHandler(learnController.getLessonDetail),
)
router.get(
  '/:subjectSlug/topics/:topicSlug/subtopics/:subtopicSlug/lessons',
  authenticate,
  asyncHandler(learnController.getLessons),
)
router.get(
  '/:subjectSlug/topics/:topicSlug/subtopics/:subtopicSlug/video',
  authenticate,
  asyncHandler(learnController.getVideo),
)
router.get(
  '/:subjectSlug/topics/:topicSlug/subtopics/:subtopicSlug/notes',
  authenticate,
  asyncHandler(learnController.getNotes),
)

export default router
