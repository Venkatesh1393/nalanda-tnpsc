import axios from 'axios'

import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  AiTutorConversationDetail,
  AiTutorConversationSummary,
  AiTutorErrorCode,
  AiTutorUsage,
  CreateAiTutorConversationInput,
  SendAiTutorMessageResult,
} from '@/types/aiTutor'

/**
 * Domain calls for the real Nalanda AI Tutor backend
 * (`backend/src/routes/aiTutor.routes.ts`, Sprint 4 Step 64). Every call
 * here is only ever reachable from the UI for a Pro/Institutional-entitled
 * user — see `pages/ai-tutor/ai-tutor-page.tsx`'s `PremiumCard` gate — but
 * the server-side `requireFeature('ai_tutor')` gate is the real boundary,
 * never this file.
 */

interface ApiEnvelope<T> {
  data: T
}

export async function getUsage(): Promise<AiTutorUsage> {
  const response = await apiClient.get<ApiEnvelope<AiTutorUsage>>(endpoints.aiTutor.usage)
  return response.data.data
}

export async function listConversations(
  search?: string,
): Promise<AiTutorConversationSummary[]> {
  const response = await apiClient.get<ApiEnvelope<AiTutorConversationSummary[]>>(
    endpoints.aiTutor.conversations,
    { params: { search } },
  )
  return response.data.data
}

export async function createConversation(
  input: CreateAiTutorConversationInput,
): Promise<AiTutorConversationSummary> {
  const response = await apiClient.post<ApiEnvelope<AiTutorConversationSummary>>(
    endpoints.aiTutor.conversations,
    input,
  )
  return response.data.data
}

export async function getConversation(
  conversationId: string,
): Promise<AiTutorConversationDetail> {
  const response = await apiClient.get<ApiEnvelope<AiTutorConversationDetail>>(
    endpoints.aiTutor.conversation(conversationId),
  )
  return response.data.data
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiClient.delete(endpoints.aiTutor.conversation(conversationId))
}

export async function pinConversation(
  conversationId: string,
): Promise<AiTutorConversationSummary> {
  const response = await apiClient.patch<ApiEnvelope<AiTutorConversationSummary>>(
    endpoints.aiTutor.pin(conversationId),
  )
  return response.data.data
}

export async function unpinConversation(
  conversationId: string,
): Promise<AiTutorConversationSummary> {
  const response = await apiClient.patch<ApiEnvelope<AiTutorConversationSummary>>(
    endpoints.aiTutor.unpin(conversationId),
  )
  return response.data.data
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<SendAiTutorMessageResult> {
  const response = await apiClient.post<ApiEnvelope<SendAiTutorMessageResult>>(
    endpoints.aiTutor.messages(conversationId),
    { content },
  )
  return response.data.data
}

/** Distinguishes "conversation cap reached" / "daily message limit
 * reached" / "provider unavailable" from any other failure, without the
 * caller needing to know the envelope shape — see
 * `services/aiService.ts#getAiExplanationErrorCode` for the same pattern. */
export function getAiTutorErrorCode(error: unknown): AiTutorErrorCode | undefined {
  if (!axios.isAxiosError(error)) return undefined
  const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error
    ?.code
  return code === 'AI_TUTOR_CONVERSATION_LIMIT_REACHED' ||
    code === 'DAILY_AI_TUTOR_LIMIT_REACHED' ||
    code === 'AI_SERVICE_UNAVAILABLE'
    ? code
    : undefined
}
