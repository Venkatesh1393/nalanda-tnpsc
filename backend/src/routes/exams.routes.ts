import { Router } from 'express'

import * as learnController from '../controllers/learn.controller'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// Public — the exam list is reference data (docs/InformationArchitecture.md's
// pre-signup exam landing pages will need this too eventually), no
// personalization in the response.
router.get('/', asyncHandler(learnController.getExams))

export default router
