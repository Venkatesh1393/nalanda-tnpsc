import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import { AI_TUTOR_CONTEXT_TYPES } from '../models/AiConversation.model'
import { MAX_MESSAGE_LENGTH } from '../constants/aiTutor'

const objectIdString = z.string().refine(isValidObjectId, 'Invalid id')

/** Sprint 4 Step 59 — `contextType`/`contextRefId` must both be present or
 * both absent; a lone `contextType` with no id (or vice versa) is a client
 * bug, not a valid "no context" request. */
export const createConversationBodySchema = z
  .object({
    language: z.enum(['en', 'ta']),
    contextType: z.enum(AI_TUTOR_CONTEXT_TYPES).optional(),
    contextRefId: objectIdString.optional(),
  })
  .refine((body) => Boolean(body.contextType) === Boolean(body.contextRefId), {
    message: 'contextType and contextRefId must be provided together',
    path: ['contextRefId'],
  })
export type CreateConversationBody = z.infer<typeof createConversationBodySchema>

export const conversationIdParamsSchema = z.object({
  conversationId: objectIdString,
})
export type ConversationIdParams = z.infer<typeof conversationIdParamsSchema>

/** Sprint 4 Step 64 — "Search Chat." `search` stays optional/untrimmed-safe
 * (an empty or whitespace-only value is treated as "no filter" by
 * `aiConversationRepository.findByUser`, not a 400). */
export const listConversationsQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
})
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>

export const sendMessageBodySchema = z.object({
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
})
export type SendMessageBody = z.infer<typeof sendMessageBodySchema>
