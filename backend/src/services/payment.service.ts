import type { BillingCycle } from '../constants/commerce'
import type { SubscriptionTier } from '../constants/roles'
import { Subscription } from '../models/Subscription.model'
import type { PaymentDocument } from '../models/Payment.model'
import * as paymentRepository from '../repositories/payment.repository'
import * as subscriptionRepository from '../repositories/subscription.repository'
import * as userRepository from '../repositories/user.repository'
import { env } from '../config/env'
import {
  getRazorpayClient,
  isRazorpayConfigured,
  isWebhookConfigured,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../config/razorpay'
import { getPlan } from './entitlement.service'
import { ApiError } from '../utils/ApiError'
import { logger } from '../config/logger'

/**
 * Sprint 4 Step 56 — Razorpay Payment + Subscription Integration, TEST MODE
 * only. Uses Razorpay's **Orders API** (one-time payment per billing-cycle
 * purchase), not the Subscriptions product — matches the exact endpoint
 * shape `docs/API.md` §8 already specified before this step
 * (`POST /payments/orders` → `POST /payments/verify` → webhook-confirmed
 * activation), and avoids needing UPI Autopay/e-mandate setup for a
 * test-mode-only step. `autoRenew` therefore always reads `false` — there
 * is no Razorpay-managed recurring billing here; a lapsed period requires
 * the student to check out again.
 *
 * **The single most important rule in this file**: a payment is never
 * "successful" because the client said so. `verifyPayment` below checks a
 * cryptographic signature and returns `{ status: 'processing' }` — it does
 * NOT activate anything. Only `processWebhookPayload`'s `payment.captured`
 * handler (Razorpay-server-to-our-server, signed with a *different* secret
 * the browser never sees) ever calls `activateSubscriptionForPayment`. This
 * is the "dual-confirmation" flow `docs/Architecture.md` §6 already
 * documented, closing the exact billing-trust gap named there.
 */

const PERIOD_DAYS: Record<BillingCycle, number> = { monthly: 30, annual: 365 }
const RECENT_PENDING_WINDOW_MS = 10 * 60 * 1000

function requireRazorpayConfigured() {
  if (!isRazorpayConfigured()) {
    throw ApiError.internal(
      'Payments are not configured on this server yet. Try again later.',
    )
  }
}

// ---- Order creation ----

export interface CreateOrderResultDTO {
  razorpayOrderId: string
  amount: number
  currency: string
  razorpayKeyId: string
}

/** Self-serve checkout only covers `plus`/`pro` — `free` needs no payment
 * and `institutional` is a "talk to sales" flow, never a card-on-file
 * self-checkout (matches the plan cards' existing frontend behavior). */
const CHECKOUT_ELIGIBLE_TIERS: SubscriptionTier[] = ['plus', 'pro']

export async function createOrder(
  userId: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle,
): Promise<CreateOrderResultDTO> {
  requireRazorpayConfigured()

  if (!CHECKOUT_ELIGIBLE_TIERS.includes(tier)) {
    throw ApiError.badRequest(`"${tier}" cannot be purchased through self-serve checkout.`)
  }

  const plan = getPlan(tier)
  const rupees = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice
  if (rupees <= 0) {
    throw ApiError.badRequest('This plan has no self-serve price configured.')
  }
  const amountPaise = Math.round(rupees * 100)

  const existing = await paymentRepository.findRecentPending(
    userId,
    tier,
    billingCycle,
    RECENT_PENDING_WINDOW_MS,
  )
  if (existing) {
    return {
      razorpayOrderId: existing.razorpayOrderId,
      amount: existing.amount,
      currency: existing.currency,
      razorpayKeyId: requireKeyId(),
    }
  }

  const razorpay = getRazorpayClient()
  let order
  try {
    order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `nalanda_${userId}_${Date.now()}`,
      notes: { userId, tier, billingCycle },
    })
  } catch (error) {
    logger.error('Razorpay order creation failed', {
      userId,
      tier,
      billingCycle,
      error: error instanceof Error ? error.message : String(error),
    })
    throw ApiError.internal('Could not start checkout with the payment provider.')
  }

  await paymentRepository.create({
    userId,
    tier,
    billingCycle,
    razorpayOrderId: order.id,
    amount: amountPaise,
    currency: order.currency,
    status: 'created',
  })

  return {
    razorpayOrderId: order.id,
    amount: amountPaise,
    currency: order.currency,
    razorpayKeyId: requireKeyId(),
  }
}

function requireKeyId(): string {
  // `requireRazorpayConfigured()` already guarantees this is set — narrows
  // the type for TypeScript without a redundant runtime branch.
  return env.RAZORPAY_KEY_ID as string
}

// ---- Client-side verification (signature check only, never activates) ----

export interface VerifyPaymentInput {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

export async function verifyPayment(
  userId: string,
  input: VerifyPaymentInput,
): Promise<{ status: 'processing' }> {
  requireRazorpayConfigured()

  const payment = await paymentRepository.findByOrderIdForUser(input.razorpayOrderId, userId)
  if (!payment) throw ApiError.notFound('No matching order for this account.')

  const valid = verifyPaymentSignature(
    input.razorpayOrderId,
    input.razorpayPaymentId,
    input.razorpaySignature,
  )
  if (!valid) {
    logger.warn('Razorpay payment signature verification failed', {
      userId,
      razorpayOrderId: input.razorpayOrderId,
    })
    throw ApiError.badRequest('Invalid payment signature.')
  }

  // Deliberately no DB mutation here — see this file's header comment.
  // Real activation happens only via the webhook below.
  return { status: 'processing' }
}

// ---- Webhook (the sole activation trigger) ----

interface RazorpayPaymentEntity {
  id: string
  order_id: string
  amount: number
  currency: string
  status: string
  error_description?: string | null
}

interface RazorpayWebhookBody {
  event: string
  payload: {
    payment?: { entity: RazorpayPaymentEntity }
    refund?: { entity: { id: string; payment_id: string } }
  }
}

export async function processWebhookPayload(
  rawBody: string,
  signature: string | undefined,
): Promise<{ received: boolean }> {
  if (!isWebhookConfigured()) {
    throw ApiError.internal('Payments are not configured on this server yet.')
  }
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    // Never log the signature or the secret — event type only, if the body
    // even parses.
    logger.warn('Razorpay webhook signature verification failed')
    throw ApiError.badRequest('Invalid webhook signature.')
  }

  let body: RazorpayWebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    throw ApiError.badRequest('Malformed webhook body.')
  }

  logger.info('Razorpay webhook received', { event: body.event })

  switch (body.event) {
    case 'payment.captured': {
      if (body.payload.payment) await handlePaymentCaptured(body.payload.payment.entity)
      break
    }
    case 'payment.failed': {
      if (body.payload.payment) await handlePaymentFailed(body.payload.payment.entity)
      break
    }
    case 'refund.processed': {
      if (body.payload.refund) await handleRefundProcessed(body.payload.refund.entity)
      break
    }
    default: {
      // Acknowledge with 200 for event types we don't act on — Razorpay
      // retries on non-2xx, and an unhandled type is not an error.
      logger.info('Razorpay webhook event not handled', { event: body.event })
    }
  }

  return { received: true }
}

async function handlePaymentCaptured(entity: RazorpayPaymentEntity): Promise<void> {
  const webhookEventId = `payment.captured:${entity.id}`
  const payment = await paymentRepository.markCapturedIfPending(entity.order_id, {
    razorpayPaymentId: entity.id,
    webhookEventId,
  })
  if (!payment) {
    // Either already captured (duplicate/retried delivery — idempotent
    // no-op, "prevent duplicate activation") or an order.id we never
    // created a Payment for (ignore rather than error, Razorpay retries
    // on non-2xx).
    logger.info('payment.captured: no pending payment matched (duplicate or unknown order)', {
      orderId: entity.order_id,
      paymentId: entity.id,
    })
    return
  }

  await activateSubscriptionForPayment(payment)
  logger.info('Subscription activated from Razorpay payment', {
    userId: payment.userId.toString(),
    tier: payment.tier,
    billingCycle: payment.billingCycle,
    orderId: entity.order_id,
    paymentId: entity.id,
  })
}

async function handlePaymentFailed(entity: RazorpayPaymentEntity): Promise<void> {
  const webhookEventId = `payment.failed:${entity.id}`
  const payment = await paymentRepository.markFailedIfPending(entity.order_id, {
    webhookEventId,
    failureReason: entity.error_description ?? 'Payment failed',
  })
  if (!payment) {
    logger.info('payment.failed: no pending payment matched (duplicate or unknown order)', {
      orderId: entity.order_id,
      paymentId: entity.id,
    })
    return
  }
  logger.info('Payment failed', {
    userId: payment.userId.toString(),
    orderId: entity.order_id,
    paymentId: entity.id,
  })
}

async function handleRefundProcessed(entity: { id: string; payment_id: string }): Promise<void> {
  const webhookEventId = `refund.processed:${entity.id}`
  const payment = await paymentRepository.markRefundedIfCaptured(entity.payment_id, webhookEventId)
  if (!payment) return
  logger.info('Payment marked refunded', {
    userId: payment.userId.toString(),
    paymentId: entity.payment_id,
  })
  // Refunding does not automatically downgrade the subscription — access
  // continues until `currentPeriodEnd` the same as a self-service
  // cancellation, per this step's "access continues until period end"
  // convention. An admin-initiated hard revoke is out of this step's scope.
}

async function activateSubscriptionForPayment(payment: PaymentDocument): Promise<void> {
  const userId = payment.userId.toString()
  const now = new Date()
  const periodEnd = new Date(now.getTime() + PERIOD_DAYS[payment.billingCycle] * 86_400_000)

  const subscription = await Subscription.findOneAndUpdate(
    { userId },
    {
      $set: {
        tier: payment.tier,
        status: 'active',
        billingCycle: payment.billingCycle,
        provider: 'razorpay',
        startDate: now,
        currentPeriodEnd: periodEnd,
        autoRenew: false,
      },
      $push: { tierHistory: { tier: payment.tier, changedAt: now } },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  )

  await Promise.all([
    userRepository.updateSubscriptionTier(userId, payment.tier),
    paymentRepository.linkSubscription(payment.id, subscription.id),
  ])
}

// ---- Cancellation ----

export interface CancelSubscriptionResultDTO {
  status: 'cancelled'
  accessUntil: string | null
}

export async function cancelSubscription(
  userId: string,
  _reason: string | undefined,
): Promise<CancelSubscriptionResultDTO> {
  const subscription = await subscriptionRepository.findByUserId(userId)
  if (!subscription || subscription.status !== 'active') {
    throw ApiError.badRequest('There is no active subscription to cancel.')
  }

  subscription.status = 'cancelled'
  subscription.autoRenew = false
  await subscription.save()

  // Deliberately does NOT touch `User.subscriptionTier` — access continues
  // until `currentPeriodEnd` (docs/API.md §8's documented cancel contract).
  // The lazy-expiry check in `subscription.service.ts#getMySubscription`
  // downgrades it once that date actually passes.
  return {
    status: 'cancelled',
    accessUntil: subscription.currentPeriodEnd?.toISOString() ?? null,
  }
}

// ---- Payment history ----

export interface PaymentHistoryItemDTO {
  id: string
  tier: SubscriptionTier
  billingCycle: BillingCycle
  amount: number
  currency: string
  status: string
  failureReason: string | null
  invoiceUrl: string | null
  createdAt: string | null
}

function toHistoryDTO(payment: PaymentDocument): PaymentHistoryItemDTO {
  return {
    id: payment.id,
    tier: payment.tier,
    billingCycle: payment.billingCycle,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    failureReason: payment.failureReason ?? null,
    invoiceUrl: payment.invoiceUrl ?? null,
    createdAt: payment.createdAt?.toISOString() ?? null,
  }
}

export async function listMyPayments(
  userId: string,
  page: number,
  limit: number,
): Promise<{ items: PaymentHistoryItemDTO[]; total: number; page: number; limit: number }> {
  const { items, total } = await paymentRepository.listByUser(userId, page, limit)
  return { items: items.map(toHistoryDTO), total, page, limit }
}

export async function getMyPayment(
  userId: string,
  paymentId: string,
): Promise<PaymentHistoryItemDTO> {
  const payment = await paymentRepository.findByUserAndId(userId, paymentId)
  if (!payment) throw ApiError.notFound('Payment not found')
  return toHistoryDTO(payment)
}
