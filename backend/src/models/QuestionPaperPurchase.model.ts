import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { PAYMENT_STATUSES, type PaymentStatus } from '../constants/commerce'

/**
 * The one-time, flat-price "unlock all previous year question papers"
 * purchase — a parallel, deliberately separate ledger from
 * `Payment.model.ts`, not a variant of it. `Payment` has `tier`/
 * `billingCycle` as *required* fields tied to the subscription system;
 * bending that shape to also cover a flat non-recurring product would mean
 * touching the already-audited subscription activation path
 * (`payment.service.ts#activateSubscriptionForPayment`) for no real reuse
 * benefit, since the two flows only actually share Razorpay's Orders API
 * primitives (order creation, signature verification), not any data shape.
 *
 * Same immutable-append-only-log shape as `Payment` otherwise — one
 * document per checkout attempt, `status: 'created'` until the webhook
 * confirms it (`payment.service.ts#processWebhookPayload`'s
 * `handlePaymentCaptured`/`handlePaymentFailed` try `Payment` first, then
 * fall back to this collection — see that file's header comment).
 */
export interface IQuestionPaperPurchase {
  userId: Types.ObjectId
  razorpayOrderId: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  webhookEventId?: string
  amount: number
  currency: string
  status: PaymentStatus
  failureReason?: string
  createdAt?: Date
}

export type QuestionPaperPurchaseDocument = HydratedDocument<IQuestionPaperPurchase>

const questionPaperPurchaseSchema = new Schema<IQuestionPaperPurchase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    razorpayOrderId: { type: String, required: true, trim: true },
    razorpayPaymentId: { type: String, trim: true },
    // Audit-only — excluded from default `find` projections, same rationale
    // as Payment.model.ts's identical field.
    razorpaySignature: { type: String, trim: true, select: false },
    webhookEventId: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: PAYMENT_STATUSES, required: true },
    failureReason: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

questionPaperPurchaseSchema.index({ userId: 1, createdAt: -1 })
questionPaperPurchaseSchema.index({ razorpayOrderId: 1 }, { unique: true })

export const QuestionPaperPurchase = model<IQuestionPaperPurchase>(
  'QuestionPaperPurchase',
  questionPaperPurchaseSchema,
)
