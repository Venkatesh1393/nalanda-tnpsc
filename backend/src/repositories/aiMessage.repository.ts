import type { Types } from 'mongoose'

import {
  AiMessage,
  type AiMessageDocument,
  type IAiMessage,
} from '../models/AiMessage.model'

export function create(
  data: Omit<IAiMessage, 'createdAt' | 'conversationId' | 'userId'> & {
    conversationId: Types.ObjectId | string
    userId: Types.ObjectId | string
  },
): Promise<AiMessageDocument> {
  return AiMessage.create(data)
}

/** Oldest-first — the order a chat transcript (and the Anthropic `messages`
 * array built from it) needs to read in. */
export function findByConversation(
  conversationId: Types.ObjectId | string,
  limit: number,
): Promise<AiMessageDocument[]> {
  return AiMessage.find({ conversationId }).sort({ createdAt: 1 }).limit(limit)
}

export function deleteByConversation(
  conversationId: Types.ObjectId | string,
): Promise<{ deletedCount?: number }> {
  return AiMessage.deleteMany({ conversationId })
}
