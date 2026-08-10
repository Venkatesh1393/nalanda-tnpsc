import type { Types } from 'mongoose'

import {
  AiConversation,
  type AiConversationDocument,
  type AiTutorContextType,
  type IAiConversation,
} from '../models/AiConversation.model'

export function create(data: {
  userId: Types.ObjectId | string
  title: string
  language: 'en' | 'ta'
  contextType?: AiTutorContextType
  contextRefId?: Types.ObjectId | string
}): Promise<AiConversationDocument> {
  return AiConversation.create(data)
}

/** Pinned-first, then newest-active — Sprint 4 Step 64's "Pinned Chat."
 * `search` (Step 64's "Search Chat") is an optional case-insensitive
 * title match, same `$regex`/`$options: 'i'` convention every other
 * module's list-search filter already uses. */
export function findByUser(
  userId: Types.ObjectId | string,
  search?: string,
): Promise<AiConversationDocument[]> {
  const query: Record<string, unknown> = { userId }
  if (search?.trim()) {
    query.title = { $regex: search.trim(), $options: 'i' }
  }
  return AiConversation.find(query).sort({ isPinned: -1, updatedAt: -1 })
}

export function countByUser(userId: Types.ObjectId | string): Promise<number> {
  return AiConversation.countDocuments({ userId })
}

/** Ownership-scoped by construction — a conversation belonging to a
 * different user simply doesn't match, same "404 not 403" pattern
 * `practice.service.ts#requireOwnedSession` established (never reveal
 * whether a conversation exists for someone else). */
export function findByIdForUser(
  conversationId: Types.ObjectId | string,
  userId: Types.ObjectId | string,
): Promise<AiConversationDocument | null> {
  return AiConversation.findOne({ _id: conversationId, userId })
}

export function updateTitle(
  conversationId: Types.ObjectId | string,
  title: string,
): Promise<AiConversationDocument | null> {
  return AiConversation.findByIdAndUpdate(
    conversationId,
    { $set: { title } },
    { new: true },
  )
}

export function recordMessage(
  conversationId: Types.ObjectId | string,
): Promise<AiConversationDocument | null> {
  return AiConversation.findByIdAndUpdate(
    conversationId,
    { $inc: { messageCount: 1 }, $set: { lastMessageAt: new Date() } },
    { new: true },
  )
}

/** Ownership-scoped the same way as `findByIdForUser` — `null` (not an
 * error) when the conversation doesn't belong to this user, so the service
 * layer's `ApiError.notFound` "404 not 403" convention applies uniformly. */
export function setPinned(
  conversationId: Types.ObjectId | string,
  userId: Types.ObjectId | string,
  isPinned: boolean,
): Promise<AiConversationDocument | null> {
  return AiConversation.findOneAndUpdate(
    { _id: conversationId, userId },
    { $set: { isPinned } },
    { new: true },
  )
}

export function deleteById(
  conversationId: Types.ObjectId | string,
): Promise<{ deletedCount?: number }> {
  return AiConversation.deleteOne({ _id: conversationId })
}

export type { IAiConversation }
