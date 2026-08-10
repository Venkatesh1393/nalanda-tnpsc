import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  BilingualText,
  QuestionDifficulty,
  QuestionOption,
  TnpscExamStage,
} from '@/services/adminQuestionsService'

/**
 * Sprint 4 Step 65 — Admin AI Question Generator. Every mutation here
 * (generate/edit/approve/reject) is independently RBAC-enforced server-side
 * (`backend/src/routes/admin/aiQuestionGenerator.routes.ts`), same
 * `content_editor`/`admin`/`super_admin` set as the real question bank.
 */

interface ApiEnvelope<T> {
  data: T
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number }
}

export type AiQuestionDraftStatus = 'pending' | 'approved' | 'rejected'

export interface AiQuestionDraftGeneration {
  batchId: string
  promptVersion: string
  provider: string
  model: string
  tokenUsage?: { inputTokens: number; outputTokens: number }
  estimatedCostUsd?: number | null
}

export interface AiQuestionDraft {
  id: string
  examIds: string[]
  subjectId: string
  topicId: string
  subtopicId: string
  questionText: BilingualText
  options: QuestionOption[]
  difficulty: QuestionDifficulty
  questionType: string
  explanation?: BilingualText
  isPreviousYear: boolean
  pyqYear?: number
  tnpscExamType?: TnpscExamStage
  tags: string[]
  status: AiQuestionDraftStatus
  reviewedBy: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  publishedQuestionId: string | null
  generation: AiQuestionDraftGeneration
  createdAt: string | null
  updatedAt: string | null
}

export interface GenerateQuestionsInput {
  examIds: string[]
  subjectId: string
  topicId: string
  subtopicId: string
  difficulty: QuestionDifficulty
  count: number
  isPreviousYear: boolean
  pyqYear?: number
  tnpscExamType?: TnpscExamStage
  language: 'en' | 'ta'
  customInstructions?: string
}

export interface GeneratedBatch {
  batchId: string
  drafts: AiQuestionDraft[]
}

export async function generateQuestions(
  input: GenerateQuestionsInput,
): Promise<GeneratedBatch> {
  const response = await apiClient.post<ApiEnvelope<GeneratedBatch>>(
    endpoints.admin.aiQuestionDraftsGenerate,
    input,
  )
  return response.data.data
}

export interface DraftListFilter {
  status?: AiQuestionDraftStatus
  subjectId?: string
  topicId?: string
  batchId?: string
  page?: number
  limit?: number
}

export interface PagedDrafts {
  items: AiQuestionDraft[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export async function listDrafts(filter: DraftListFilter): Promise<PagedDrafts> {
  const response = await apiClient.get<ApiEnvelope<AiQuestionDraft[]>>(
    endpoints.admin.aiQuestionDrafts,
    { params: filter },
  )
  return {
    items: response.data.data,
    page: response.data.meta?.page ?? 1,
    limit: response.data.meta?.limit ?? response.data.data.length,
    total: response.data.meta?.total ?? response.data.data.length,
    totalPages: response.data.meta?.totalPages ?? 1,
  }
}

export async function getDraft(id: string): Promise<AiQuestionDraft> {
  const response = await apiClient.get<ApiEnvelope<AiQuestionDraft>>(
    endpoints.admin.aiQuestionDraftDetail(id),
  )
  return response.data.data
}

export interface UpdateDraftInput {
  questionText?: { en: string; ta: string }
  options?: { optionId: string; text: { en: string; ta: string }; isCorrect: boolean }[]
  explanation?: { en?: string; ta?: string }
  difficulty?: QuestionDifficulty
  tags?: string[]
}

export async function updateDraft(
  id: string,
  input: UpdateDraftInput,
): Promise<AiQuestionDraft> {
  const response = await apiClient.patch<ApiEnvelope<AiQuestionDraft>>(
    endpoints.admin.aiQuestionDraftDetail(id),
    input,
  )
  return response.data.data
}

export async function approveDraft(id: string): Promise<AiQuestionDraft> {
  const response = await apiClient.post<ApiEnvelope<AiQuestionDraft>>(
    endpoints.admin.approveAiQuestionDraft(id),
  )
  return response.data.data
}

export async function rejectDraft(id: string, reason?: string): Promise<AiQuestionDraft> {
  const response = await apiClient.post<ApiEnvelope<AiQuestionDraft>>(
    endpoints.admin.rejectAiQuestionDraft(id),
    { reason },
  )
  return response.data.data
}
