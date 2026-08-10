import type { Types } from 'mongoose'

import type { BillingCycle, PaymentStatus } from '../constants/commerce'
import type { SubscriptionTier } from '../constants/roles'
import { Payment, type IPayment, type PaymentDocument } from '../models/Payment.model'

export function create(
  data: Omit<IPayment, 'userId' | 'createdAt'> & { userId: Types.ObjectId | string },
): Promise<PaymentDocument> {
  return Payment.create(data)
}

export function findByOrderId(razorpayOrderId: string): Promise<PaymentDocument | null> {
  return Payment.findOne({ razorpayOrderId })
}

export function findByOrderIdForUser(
  razorpayOrderId: string,
  userId: string,
): Promise<PaymentDocument | null> {
  return Payment.findOne({ razorpayOrderId, userId })
}

export function findByUserAndId(
  userId: string,
  paymentId: string,
): Promise<PaymentDocument | null> {
  return Payment.findOne({ _id: paymentId, userId })
}

/** Admin-only — no user-ownership scoping, unlike `findByUserAndId` above. */
export function findById(paymentId: string): Promise<PaymentDocument | null> {
  return Payment.findById(paymentId)
}

/** A same-user, same-plan `Payment` still in `created` status from the last
 * few minutes is reused instead of minting a fresh Razorpay order —
 * "idempotency where appropriate" for the common double-click/back-button
 * case, without needing a client-supplied idempotency key. */
export function findRecentPending(
  userId: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle,
  sinceMs: number,
): Promise<PaymentDocument | null> {
  return Payment.findOne({
    userId,
    tier,
    billingCycle,
    status: 'created',
    createdAt: { $gte: new Date(Date.now() - sinceMs) },
  }).sort({ createdAt: -1 })
}

/**
 * Idempotent capture: only transitions a payment OUT of a non-terminal
 * state. A second delivery of the same (or a replayed) webhook for an
 * already-`captured` payment matches nothing here and returns `null` —
 * the caller treats that as "already processed, do nothing twice" rather
 * than erroring, per Sprint 4 Step 56's "prevent duplicate activation"
 * requirement.
 */
export function markCapturedIfPending(
  razorpayOrderId: string,
  data: { razorpayPaymentId: string; razorpaySignature?: string; webhookEventId: string },
): Promise<PaymentDocument | null> {
  return Payment.findOneAndUpdate(
    { razorpayOrderId, status: 'created' },
    { $set: { status: 'captured', ...data } },
    { new: true },
  )
}

export function markFailedIfPending(
  razorpayOrderId: string,
  data: { webhookEventId: string; failureReason?: string },
): Promise<PaymentDocument | null> {
  return Payment.findOneAndUpdate(
    { razorpayOrderId, status: 'created' },
    { $set: { status: 'failed', ...data } },
    { new: true },
  )
}

export function markRefundedIfCaptured(
  razorpayPaymentId: string,
  webhookEventId: string,
): Promise<PaymentDocument | null> {
  return Payment.findOneAndUpdate(
    { razorpayPaymentId, status: 'captured' },
    { $set: { status: 'refunded', webhookEventId } },
    { new: true },
  )
}

export function linkSubscription(
  paymentId: string,
  subscriptionId: string,
): Promise<PaymentDocument | null> {
  return Payment.findByIdAndUpdate(paymentId, { $set: { subscriptionId } }, { new: true })
}

export async function listByUser(
  userId: string,
  page: number,
  limit: number,
): Promise<{ items: PaymentDocument[]; total: number }> {
  const query = { userId }
  const [items, total] = await Promise.all([
    Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Payment.countDocuments(query),
  ])
  return { items, total }
}

export type AdminPaymentListFilter = {
  userId?: string
  status?: PaymentStatus
}

function buildAdminQuery(filter: AdminPaymentListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (filter.userId) query.userId = filter.userId
  if (filter.status) query.status = filter.status
  return query
}

export async function listForAdmin(
  filter: AdminPaymentListFilter,
  page: number,
  limit: number,
): Promise<{ items: PaymentDocument[]; total: number }> {
  const query = buildAdminQuery(filter)
  const [items, total] = await Promise.all([
    Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Payment.countDocuments(query),
  ])
  return { items, total }
}
