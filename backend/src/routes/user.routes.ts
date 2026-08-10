import { Router } from 'express'

import * as userController from '../controllers/user.controller'
import { authenticate } from '../middleware/auth.middleware'
import { uploadAvatarImage } from '../middleware/upload.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import { updateMeSchema, updatePreferencesSchema } from '../validators/user.validator'

const router = Router()

router.get('/me', authenticate, asyncHandler(userController.getMe))
router.patch(
  '/me',
  authenticate,
  validate({ body: updateMeSchema }),
  asyncHandler(userController.updateMe),
)
router.patch(
  '/me/preferences',
  authenticate,
  validate({ body: updatePreferencesSchema }),
  asyncHandler(userController.updatePreferences),
)
router.post(
  '/me/avatar',
  authenticate,
  uploadAvatarImage.single('avatar'),
  asyncHandler(userController.uploadAvatar),
)
router.delete('/me/avatar', authenticate, asyncHandler(userController.deleteAvatar))

export default router
