import { Router } from 'express'

import * as paymentsController from '../controllers/payments.controller'
import { authenticate } from '../middleware/auth.middleware'
import { createRateLimiter } from '../middleware/rateLimiter.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import {
  cancelSubscriptionBodySchema,
  createOrderBodySchema,
  listPaymentsQuerySchema,
  paymentIdParamsSchema,
  verifyPaymentBodySchema,
} from '../validators/payments.validator'

/**
 * Sprint 4 Step 56 — Razorpay Payment + Subscription Integration (TEST MODE
 * only, see `services/payment.service.ts`'s header comment for the full
 * flow/architecture). `GET /plans` and `GET /subscription` are Step 55's
 * original read surface, unchanged. Everything below is new this step.
 */
const router = Router()

// Order creation/verification are user-initiated, low-frequency actions —
// this caps scripted abuse (spamming order creation) without throttling a
// real checkout attempt.
const checkoutRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  message: 'Too many checkout attempts — please wait a moment and try again.',
})

router.get('/plans', paymentsController.getPlans)
router.get('/subscription', authenticate, asyncHandler(paymentsController.getMySubscription))

router.post(
  '/orders',
  authenticate,
  checkoutRateLimiter,
  validate({ body: createOrderBodySchema }),
  asyncHandler(paymentsController.createOrder),
)

router.post(
  '/verify',
  authenticate,
  checkoutRateLimiter,
  validate({ body: verifyPaymentBodySchema }),
  asyncHandler(paymentsController.verifyPayment),
)

// No `authenticate` — see `controllers/payments.controller.ts#webhook`'s
// header comment. No `validate()` either: the body is verified by
// signature, not by shape, before anything touches it.
router.post('/webhook', asyncHandler(paymentsController.webhook))

router.post(
  '/subscription/cancel',
  authenticate,
  validate({ body: cancelSubscriptionBodySchema }),
  asyncHandler(paymentsController.cancelSubscription),
)

router.get(
  '/invoices',
  authenticate,
  validate({ query: listPaymentsQuerySchema }),
  asyncHandler(paymentsController.listInvoices),
)

router.get(
  '/invoices/:paymentId',
  authenticate,
  validate({ params: paymentIdParamsSchema }),
  asyncHandler(paymentsController.getInvoice),
)

export default router
