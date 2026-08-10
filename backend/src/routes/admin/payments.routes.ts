import { Router } from 'express'

import * as adminPaymentsController from '../../controllers/admin/adminPayments.controller'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import { listAdminPaymentsQuerySchema } from '../../validators/admin.validator'
import { paymentIdParamsSchema } from '../../validators/payments.validator'

/**
 * Sprint 4 Step 56 — read-only, same viewer set as Subscriptions
 * (`admin`/`support`/`super_admin`). No mutation route exists here, by
 * design — a refund/status override requires a real Razorpay-side action
 * (Dashboard or Refunds API), never a form in this admin panel.
 */
const router = Router()

const canViewPayments = authorizeRoles('admin', 'support', 'super_admin')

router.get(
  '/',
  canViewPayments,
  validate({ query: listAdminPaymentsQuerySchema }),
  asyncHandler(adminPaymentsController.listPayments),
)

router.get(
  '/:paymentId',
  canViewPayments,
  validate({ params: paymentIdParamsSchema }),
  asyncHandler(adminPaymentsController.getPayment),
)

export default router
