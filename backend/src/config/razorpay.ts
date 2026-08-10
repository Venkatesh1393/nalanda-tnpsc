import Razorpay from 'razorpay'
import { validatePaymentVerification, validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils'

import { env } from './env'

/**
 * Sprint 4 Step 56 — the only file besides `services/payment.service.ts`
 * that touches the `razorpay` SDK directly (same "one adapter file per
 * third-party SDK" convention as `config/cloudinary.ts`). TEST MODE only —
 * `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` must be `rzp_test_...`/its paired
 * secret from the Razorpay Dashboard's Test Mode, never live keys.
 *
 * Deliberately lazy and optional-safe: the server must keep booting even
 * before a real Razorpay account exists (`env.ts`'s `RAZORPAY_*` are
 * `.optional()`), so construction happens on first use, not at import time,
 * and every caller goes through `isRazorpayConfigured()` first.
 */

let client: Razorpay | null = null

/** Gates checkout (order creation + payment-signature verification) —
 * independent of webhook configuration below, since the two secrets are
 * configured separately in the Razorpay Dashboard and either can exist
 * without the other. */
export function isRazorpayConfigured(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)
}

/** Gates the webhook endpoint — only needs `RAZORPAY_WEBHOOK_SECRET`, not
 * the checkout key pair, so webhook processing can be configured (and
 * tested) independently of whether checkout itself is live yet. */
export function isWebhookConfigured(): boolean {
  return Boolean(env.RAZORPAY_WEBHOOK_SECRET)
}

export function getRazorpayClient(): Razorpay {
  if (!isRazorpayConfigured()) {
    throw new Error(
      'Razorpay is not configured — set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET in backend/.env',
    )
  }
  if (!client) {
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })
  }
  return client
}

/** HMAC-SHA256(order_id + "|" + payment_id, key_secret) — the exact formula
 * Razorpay's Checkout `handler` callback signature is computed with. Never
 * trust a client-reported "payment succeeded" without this passing. */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false
  return validatePaymentVerification(
    { order_id: orderId, payment_id: paymentId },
    signature,
    env.RAZORPAY_KEY_SECRET,
  )
}

/** HMAC-SHA256(rawBody, webhook_secret) — `rawBody` MUST be the exact bytes
 * Razorpay sent (never a re-serialized `JSON.stringify` of the parsed body,
 * which can differ in key order/whitespace and silently fail verification). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false
  return validateWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)
}
