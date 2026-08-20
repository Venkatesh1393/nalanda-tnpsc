import { Router } from 'express'

import * as questionPaperController from '../controllers/questionPaper.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import { idParamsSchema, listQuerySchema } from '../validators/questionPaper.validator'

/** Previous Year Question Papers — always `authenticate`d, unlike Current
 * Affairs' public reads, since the free-limit/purchase gate is inherently
 * per-user (`services/questionPaper.service.ts`). */
const router = Router()

router.get(
  '/',
  authenticate,
  validate({ query: listQuerySchema }),
  asyncHandler(questionPaperController.listPapers),
)

router.get(
  '/:id/download',
  authenticate,
  validate({ params: idParamsSchema }),
  asyncHandler(questionPaperController.downloadPaper),
)

export default router
