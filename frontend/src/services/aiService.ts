import axios from 'axios'

import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { AiExplanationErrorCode, AiExplanationResult } from '@/types/ai'

/**
 * Sprint 4 Step 57 — Premium AI Explanation. `POST /ai/explain` is real,
 * gated server-side by the `ai_explanations` entitlement (Sprint 4 Step 55)
 * — this call is only ever reachable from the UI for a premium-entitled
 * user on a real (backend-tracked) Smart Practice session; see
 * `features/practice/components/ai-explanation-panel.tsx` for the gating.
 */

interface ApiEnvelope<T> {
  data: T
}

export async function explainQuestion(
  sessionId: string,
  questionId: string,
  language: 'en' | 'ta',
): Promise<AiExplanationResult> {
  const response = await apiClient.post<ApiEnvelope<AiExplanationResult>>(
    endpoints.ai.explain,
    { sessionId, questionId, language },
  )
  return response.data.data
}

/** Distinguishes "you're out of AI calls today" from "the provider is
 * down" from any other failure, without the caller needing to know the
 * envelope shape — see `types/ai.ts#AiExplanationErrorCode`. */
export function getAiExplanationErrorCode(error: unknown): AiExplanationErrorCode | undefined {
  if (!axios.isAxiosError(error)) return undefined
  const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code
  return code === 'DAILY_AI_LIMIT_REACHED' || code === 'AI_SERVICE_UNAVAILABLE' ? code : undefined
}
