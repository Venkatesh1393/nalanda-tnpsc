import type { Request, Response } from 'express'

import * as paymentService from '../services/payment.service'
import * as subscriptionService from '../services/subscription.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import type {
  CancelSubscriptionBody,
  CreateOrderBody,
  ListPaymentsQuery,
  PaymentIdParams,
  VerifyPaymentBody,
} from '../validators/payments.validator'

export function getPlans(_req: Request, res: Response): void {
  sendSuccess(res, subscriptionService.getPlanCatalog())
}

export async function getMySubscription(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const subscription = await subscriptionService.getMySubscription(req.user.sub)
  sendSuccess(res, subscription)
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { tier, billingCycle } = req.body as CreateOrderBody
  const order = await paymentService.createOrder(req.user.sub, tier, billingCycle)
  sendSuccess(res, order, 201)
}

export async function verifyPayment(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const result = await paymentService.verifyPayment(req.user.sub, req.body as VerifyPaymentBody)
  sendSuccess(res, result)
}

export async function createPaperUnlockOrder(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const order = await paymentService.createPaperUnlockOrder(req.user.sub)
  sendSuccess(res, order, 201)
}

export async function verifyPaperUnlockPayment(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const result = await paymentService.verifyPaperUnlockPayment(
    req.user.sub,
    req.body as VerifyPaymentBody,
  )
  sendSuccess(res, result)
}

/**
 * Unauthenticated by design — Razorpay calls this server-to-server, never
 * carrying a Nalanda session token. Trust is established entirely by the
 * `X-Razorpay-Signature` header check inside `paymentService`, not by
 * `middleware/auth.middleware.ts`. Needs the raw body captured in app.ts
 * (`req.rawBody`) since the signature is computed over the exact bytes
 * Razorpay sent, not a re-serialized `req.body`.
 */
export async function webhook(req: Request, res: Response): Promise<void> {
  const signature = req.header('x-razorpay-signature')
  const rawBody = req.rawBody?.toString('utf-8') ?? JSON.stringify(req.body)
  const result = await paymentService.processWebhookPayload(rawBody, signature)
  sendSuccess(res, result)
}

export async function cancelSubscription(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { reason } = req.body as CancelSubscriptionBody
  const result = await paymentService.cancelSubscription(req.user.sub, reason)
  sendSuccess(res, result)
}

export async function listInvoices(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { page, limit } = req.query as unknown as ListPaymentsQuery
  const result = await paymentService.listMyPayments(req.user.sub, page, limit)
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / result.limit) || 1,
  })
}

export async function getInvoice(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { paymentId } = req.params as unknown as PaymentIdParams
  const payment = await paymentService.getMyPayment(req.user.sub, paymentId)
  sendSuccess(res, payment)
}
