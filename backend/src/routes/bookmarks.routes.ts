import { Router } from 'express'

import * as bookmarkController from '../controllers/bookmark.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import { createBookmarkSchema } from '../validators/bookmark.validator'

const router = Router()

router.get('/', authenticate, asyncHandler(bookmarkController.list))

router.post(
  '/',
  authenticate,
  validate({ body: createBookmarkSchema }),
  asyncHandler(bookmarkController.create),
)

router.post(
  '/toggle',
  authenticate,
  validate({ body: createBookmarkSchema }),
  asyncHandler(bookmarkController.toggle),
)

router.delete('/:bookmarkId', authenticate, asyncHandler(bookmarkController.remove))

export default router
