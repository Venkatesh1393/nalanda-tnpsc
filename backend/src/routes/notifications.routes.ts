import { Router } from 'express'

import * as notificationController from '../controllers/notification.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import {
  listQuerySchema,
  notificationIdParamsSchema,
} from '../validators/notification.validator'

const router = Router()

// Static paths registered before `/:notificationId`, same Express-
// declaration-order convention as every other module's list-vs-detail split.
router.get(
  '/unread-count',
  authenticate,
  asyncHandler(notificationController.getUnreadCount),
)

router.post('/read-all', authenticate, asyncHandler(notificationController.markAllAsRead))

router.get(
  '/',
  authenticate,
  validate({ query: listQuerySchema }),
  asyncHandler(notificationController.getNotifications),
)

router.patch(
  '/:notificationId/read',
  authenticate,
  validate({ params: notificationIdParamsSchema }),
  asyncHandler(notificationController.markAsRead),
)

router.patch(
  '/:notificationId/archive',
  authenticate,
  validate({ params: notificationIdParamsSchema }),
  asyncHandler(notificationController.archive),
)

router.patch(
  '/:notificationId/unarchive',
  authenticate,
  validate({ params: notificationIdParamsSchema }),
  asyncHandler(notificationController.unarchive),
)

router.delete(
  '/:notificationId',
  authenticate,
  validate({ params: notificationIdParamsSchema }),
  asyncHandler(notificationController.remove),
)

export default router
