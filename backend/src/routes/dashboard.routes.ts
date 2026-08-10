import { Router } from 'express'

import * as dashboardController from '../controllers/dashboard.controller'
import { authenticate } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/', authenticate, asyncHandler(dashboardController.getDashboard))

export default router
