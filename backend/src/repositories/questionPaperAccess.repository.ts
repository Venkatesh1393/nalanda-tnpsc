import type { Types } from 'mongoose'

import { QuestionPaperAccess } from '../models/QuestionPaperAccess.model'

export async function hasAccess(
  userId: Types.ObjectId | string,
  paperId: Types.ObjectId | string,
): Promise<boolean> {
  const doc = await QuestionPaperAccess.exists({ userId, paperId })
  return doc !== null
}

/** Number of *distinct* papers this user has ever free-accessed — the
 * unique `{userId, paperId}` index guarantees this never double-counts a
 * repeat download of the same paper. */
export function countForUser(userId: Types.ObjectId | string): Promise<number> {
  return QuestionPaperAccess.countDocuments({ userId })
}

/** Idempotent — a duplicate-key error (code 11000, from the unique index)
 * means this exact (user, paper) grant already exists, which is exactly the
 * "already free-accessed, don't recount" case the caller wants to treat as
 * success, not an error. */
export async function grant(
  userId: Types.ObjectId | string,
  paperId: Types.ObjectId | string,
): Promise<void> {
  try {
    await QuestionPaperAccess.create({ userId, paperId })
  } catch (error) {
    if (isDuplicateKeyError(error)) return
    throw error
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 11000
  )
}
