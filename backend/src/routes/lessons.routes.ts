import { Router } from 'express'

import * as lessonController from '../controllers/lesson.controller'
import { authenticate } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/:lessonId', authenticate, asyncHandler(lessonController.getLessonById))

export default router
