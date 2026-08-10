import { Types } from 'mongoose'

import {
  XpTransaction,
  type XpTransactionDocument,
  type XpTransactionReason,
} from '../models/XpTransaction.model'

function toObjectId(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new Types.ObjectId(id) : id
}

export interface CreateXpTransactionInput {
  userId: Types.ObjectId | string
  xpAmount: number
  coinsAmount: number
  reason: XpTransactionReason
  refId?: Types.ObjectId | string
}

export function create(input: CreateXpTransactionInput): Promise<XpTransactionDocument> {
  return XpTransaction.create(input)
}

/** Real source for "XP gained this week"/"this month" — summed on demand
 * from the audit ledger, never a separately maintained counter that would
 * need its own reset job (same live-aggregation precedent
 * `analytics.repository.ts` established throughout). */
export async function sumXpSince(
  userId: Types.ObjectId | string,
  since: Date,
): Promise<number> {
  const [row] = await XpTransaction.aggregate<{ total: number }>([
    { $match: { userId: toObjectId(userId), createdAt: { $gte: since } } },
    { $group: { _id: null, total: { $sum: '$xpAmount' } } },
  ])
  return row?.total ?? 0
}

export function findRecentByUser(
  userId: Types.ObjectId | string,
  limit: number,
): Promise<XpTransactionDocument[]> {
  return XpTransaction.find({ userId }).sort({ createdAt: -1 }).limit(limit)
}
