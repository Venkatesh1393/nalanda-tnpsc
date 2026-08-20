import type { Types } from 'mongoose'

import {
  QuestionPaperPurchase,
  type IQuestionPaperPurchase,
  type QuestionPaperPurchaseDocument,
} from '../models/QuestionPaperPurchase.model'

export function create(
  data: Omit<IQuestionPaperPurchase, 'userId' | 'createdAt'> & {
    userId: Types.ObjectId | string
  },
): Promise<QuestionPaperPurchaseDocument> {
  return QuestionPaperPurchase.create(data)
}

export function findByOrderIdForUser(
  razorpayOrderId: string,
  userId: string,
): Promise<QuestionPaperPurchaseDocument | null> {
  return QuestionPaperPurchase.findOne({ razorpayOrderId, userId })
}

/** A same-user purchase attempt still in `created` status from the last few
 * minutes is reused instead of minting a fresh Razorpay order — same
 * double-click/back-button idempotency as `payment.repository.ts`'s
 * `findRecentPending`. */
export function findRecentPending(
  userId: string,
  sinceMs: number,
): Promise<QuestionPaperPurchaseDocument | null> {
  return QuestionPaperPurchase.findOne({
    userId,
    status: 'created',
    createdAt: { $gte: new Date(Date.now() - sinceMs) },
  }).sort({ createdAt: -1 })
}

/** Idempotent capture — same "only transitions OUT of a non-terminal state"
 * reasoning as `payment.repository.ts#markCapturedIfPending`; a duplicate
 * webhook delivery for an already-`captured` purchase matches nothing and
 * returns `null`. */
export function markCapturedIfPending(
  razorpayOrderId: string,
  data: { razorpayPaymentId: string; razorpaySignature?: string; webhookEventId: string },
): Promise<QuestionPaperPurchaseDocument | null> {
  return QuestionPaperPurchase.findOneAndUpdate(
    { razorpayOrderId, status: 'created' },
    { $set: { status: 'captured', ...data } },
    { new: true },
  )
}

export function markFailedIfPending(
  razorpayOrderId: string,
  data: { webhookEventId: string; failureReason?: string },
): Promise<QuestionPaperPurchaseDocument | null> {
  return QuestionPaperPurchase.findOneAndUpdate(
    { razorpayOrderId, status: 'created' },
    { $set: { status: 'failed', ...data } },
    { new: true },
  )
}
