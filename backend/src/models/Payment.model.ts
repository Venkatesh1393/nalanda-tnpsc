import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import {
  BILLING_CYCLES,
  PAYMENT_STATUSES,
  type BillingCycle,
  type PaymentStatus,
} from '../constants/commerce'
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '../constants/roles'

/**
 * Immutable append-only log (docs/Database.md §4.6) — a refund is a new
 * document referencing the original via `subscriptionId`/`userId`, never an
 * edit to a past payment. `updatedAt` is intentionally not tracked.
 *
 * One document per checkout attempt, created at order-creation time
 * (`status: 'created'`) — `razorpayPaymentId`/`webhookEventId` are only
 * filled in once the webhook confirms the payment (Sprint 4 Step 56).
 * `webhookEventId` is informational only, NOT uniquely indexed — Mongoose
 * documents with the path unset still round-trip as BSON `null` on insert
 * (the same `undefined`→`null` gotcha documented for query filters
 * elsewhere in this codebase), so a `sparse: true` unique index on it
 * collides the moment a second still-`created` payment exists, breaking
 * ordinary order creation. Real idempotency comes from
 * `repositories/payment.repository.ts`'s status-guarded
 * `markCapturedIfPending`/`markFailedIfPending` (`{razorpayOrderId,
 * status:'created'}` → atomic transition), not from a unique index here.
 */
export interface IPayment {
  userId: Types.ObjectId
  subscriptionId?: Types.ObjectId
  /** Denormalized from the plan being purchased, not read back from
   * `Subscription` — a payment's historical plan/cycle must stay accurate
   * even if the subscription itself later changes tier. */
  tier: SubscriptionTier
  billingCycle: BillingCycle
  razorpayOrderId: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  webhookEventId?: string
  amount: number
  currency: string
  status: PaymentStatus
  /** Set from the webhook's `error_description` on `payment.failed` —
   * display-only, never a secret. */
  failureReason?: string
  invoiceUrl?: string
  createdAt?: Date
}

export type PaymentDocument = HydratedDocument<IPayment>

const paymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    tier: { type: String, enum: SUBSCRIPTION_TIERS, required: true },
    billingCycle: { type: String, enum: BILLING_CYCLES, required: true },
    razorpayOrderId: { type: String, required: true, trim: true },
    razorpayPaymentId: { type: String, trim: true },
    // Not needed for normal reads (audit-only) — excluded from default `find`
    // projections; pass `.select('+razorpaySignature')` when it's genuinely needed.
    razorpaySignature: { type: String, trim: true, select: false },
    webhookEventId: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: PAYMENT_STATUSES, required: true },
    failureReason: { type: String, trim: true },
    invoiceUrl: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

paymentSchema.index({ userId: 1, createdAt: -1 })
paymentSchema.index({ razorpayOrderId: 1 }, { unique: true })

export const Payment = model<IPayment>('Payment', paymentSchema)
