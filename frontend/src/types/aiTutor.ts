/**
 * Sprint 4 Step 64 — Nalanda AI Tutor. Mirrors the backend's
 * `AiTutorConversationSummaryDTO`/`AiTutorMessageDTO`/
 * `AiTutorConversationDetailDTO`/`AiTutorUsageDTO`
 * (`backend/src/services/ai/aiTutor.service.ts`) field for field.
 */

export const AI_TUTOR_CONTEXT_TYPES = ['lesson', 'question', 'topic'] as const
export type AiTutorContextType = (typeof AI_TUTOR_CONTEXT_TYPES)[number]

export type AiConfidenceLevel = 'high' | 'low' | 'escalated'

export type AiTutorConversationSummary = {
  id: string
  title: string
  language: 'en' | 'ta'
  contextType: AiTutorContextType | null
  isPinned: boolean
  messageCount: number
  lastMessageAt: string | null
  createdAt: string
}

export type AiTutorMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  confidenceFlag: AiConfidenceLevel | null
  createdAt: string
}

export type AiTutorConversationDetail = AiTutorConversationSummary & {
  messages: AiTutorMessage[]
}

export type AiTutorUsage = {
  activeConversations: number
  maxActiveConversations: number
  messagesToday: number
  dailyMessageLimit: number
}

export type CreateAiTutorConversationInput = {
  language: 'en' | 'ta'
  contextType?: AiTutorContextType
  contextRefId?: string
}

export type SendAiTutorMessageResult = {
  conversation: AiTutorConversationSummary
  message: AiTutorMessage
}

/** Distinguishes the two backend error codes this feature can 429/503 with
 * from any other failure, without the caller needing to know the envelope
 * shape — same pattern as `types/ai.ts#AiExplanationErrorCode`. */
export type AiTutorErrorCode =
  | 'AI_TUTOR_CONVERSATION_LIMIT_REACHED'
  | 'DAILY_AI_TUTOR_LIMIT_REACHED'
  | 'AI_SERVICE_UNAVAILABLE'
