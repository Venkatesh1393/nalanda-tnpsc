import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import { BILLING_CYCLES } from '../constants/commerce'

/** Self-serve checkout only ever covers `plus`/`pro` — `free` needs no
 * order and `institutional` is a "talk to sales" flow (see
 * `services/payment.service.ts#CHECKOUT_ELIGIBLE_TIERS`, kept in sync). */
export const createOrderBodySchema = z.object({
  tier: z.enum(['plus', 'pro']),
  billingCycle: z.enum(BILLING_CYCLES),
})
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>

export const verifyPaymentBodySchema = z.object({
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  razorpaySignature: z.string().trim().min(1),
})
export type VerifyPaymentBody = z.infer<typeof verifyPaymentBodySchema>

export const cancelSubscriptionBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
})
export type CancelSubscriptionBody = z.infer<typeof cancelSubscriptionBodySchema>

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>

export const paymentIdParamsSchema = z.object({
  paymentId: z.string().refine(isValidObjectId, 'Invalid paymentId'),
})
export type PaymentIdParams = z.infer<typeof paymentIdParamsSchema>
