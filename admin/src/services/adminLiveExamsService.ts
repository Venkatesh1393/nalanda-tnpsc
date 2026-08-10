import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  BilingualParagraphs,
  BilingualText,
  PagedResult,
} from './adminContentService'

interface ApiEnvelope<T> {
  data: T
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number }
}

export type LiveExamStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled'
export type LiveExamEffectiveStatus = 'upcoming' | 'live' | 'completed' | 'cancelled'
export type ResultPublicationMode = 'immediate' | 'scheduled'

export interface AdminLiveExam {
  id: string
  title: BilingualText
  description: BilingualText
  examId: string
  subjectIds: string[]
  questionIds: string[]
  scheduledStartAt: string
  scheduledEndAt: string
  durationMinutes: number
  totalQuestions: number
  totalMarks: number
  marksPerQuestion: number
  negativeMarking: { enabled: boolean; marksPerWrongAnswer: number }
  instructions: BilingualParagraphs
  resultPublication: {
    mode: ResultPublicationMode
    publishAt: string | null
    publishedAt: string | null
  }
  status: LiveExamStatus
  effectiveStatus: LiveExamEffectiveStatus
  attemptCount: number
}

export interface LiveExamInput {
  title: { en: string; ta?: string }
  description: { en: string; ta?: string }
  examId: string
  subjectIds: string[]
  questionIds: string[]
  scheduledStartAt: string
  scheduledEndAt: string
  durationMinutes: number
  marksPerQuestion: number
  negativeMarking: { enabled: boolean; marksPerWrongAnswer: number }
  instructions: { en: string[]; ta: string[] }
  resultPublication: { mode: ResultPublicationMode; publishAt?: string }
}

export async function listLiveExams(params: {
  search?: string
  examId?: string
  status?: LiveExamStatus
  page?: number
  limit?: number
}): Promise<PagedResult<AdminLiveExam>> {
  const response = await apiClient.get<ApiEnvelope<AdminLiveExam[]>>(
    endpoints.admin.liveExams,
    {
      params,
    },
  )
  return {
    items: response.data.data,
    page: response.data.meta?.page ?? 1,
    limit: response.data.meta?.limit ?? response.data.data.length,
    total: response.data.meta?.total ?? response.data.data.length,
    totalPages: response.data.meta?.totalPages ?? 1,
  }
}

export async function getLiveExam(id: string): Promise<AdminLiveExam> {
  const response = await apiClient.get<ApiEnvelope<AdminLiveExam>>(
    endpoints.admin.liveExamDetail(id),
  )
  return response.data.data
}

export async function createLiveExam(input: LiveExamInput): Promise<AdminLiveExam> {
  const response = await apiClient.post<ApiEnvelope<AdminLiveExam>>(
    endpoints.admin.liveExams,
    input,
  )
  return response.data.data
}

export async function updateLiveExam(
  id: string,
  input: Partial<LiveExamInput>,
): Promise<AdminLiveExam> {
  const response = await apiClient.patch<ApiEnvelope<AdminLiveExam>>(
    endpoints.admin.liveExamDetail(id),
    input,
  )
  return response.data.data
}

export async function publishLiveExam(id: string): Promise<AdminLiveExam> {
  const response = await apiClient.post<ApiEnvelope<AdminLiveExam>>(
    endpoints.admin.publishLiveExam(id),
  )
  return response.data.data
}

export async function cancelLiveExam(id: string): Promise<AdminLiveExam> {
  const response = await apiClient.post<ApiEnvelope<AdminLiveExam>>(
    endpoints.admin.cancelLiveExam(id),
  )
  return response.data.data
}

export async function publishLiveExamResults(id: string): Promise<AdminLiveExam> {
  const response = await apiClient.post<ApiEnvelope<AdminLiveExam>>(
    endpoints.admin.publishLiveExamResults(id),
  )
  return response.data.data
}
