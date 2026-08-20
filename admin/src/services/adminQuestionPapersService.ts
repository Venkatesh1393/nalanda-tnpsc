import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'

interface ApiEnvelope<T> {
  data: T
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number }
}

export interface BilingualText {
  en?: string
  ta?: string
}

export type TnpscExamStage = 'prelims' | 'mains' | 'interview'
export type QuestionPaperStatus = 'active' | 'inactive' | 'archived'

export interface AdminQuestionPaper {
  id: string
  examId: string
  year: number
  title: BilingualText
  tnpscExamType?: TnpscExamStage
  fileUrl?: string
  fileBytes?: number
  isActive: boolean
  status: QuestionPaperStatus
  createdAt: string | null
  updatedAt: string | null
}

export interface QuestionPaperListFilter {
  search?: string
  examId?: string
  year?: number
  status?: QuestionPaperStatus
  page?: number
  limit?: number
}

export interface PagedResult<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export async function listQuestionPapers(
  filter: QuestionPaperListFilter,
): Promise<PagedResult<AdminQuestionPaper>> {
  const response = await apiClient.get<ApiEnvelope<AdminQuestionPaper[]>>(
    endpoints.admin.questionPapers,
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

export async function getQuestionPaper(id: string): Promise<AdminQuestionPaper> {
  const response = await apiClient.get<ApiEnvelope<AdminQuestionPaper>>(
    endpoints.admin.questionPaperDetail(id),
  )
  return response.data.data
}

export interface QuestionPaperInput {
  examId: string
  year: number
  title: { en: string; ta?: string }
  tnpscExamType?: TnpscExamStage
  isActive: boolean
}

export async function createQuestionPaper(
  input: QuestionPaperInput,
): Promise<AdminQuestionPaper> {
  const response = await apiClient.post<ApiEnvelope<AdminQuestionPaper>>(
    endpoints.admin.questionPapers,
    input,
  )
  return response.data.data
}

export async function updateQuestionPaper(
  id: string,
  input: Partial<QuestionPaperInput>,
): Promise<AdminQuestionPaper> {
  const response = await apiClient.patch<ApiEnvelope<AdminQuestionPaper>>(
    endpoints.admin.questionPaperDetail(id),
    input,
  )
  return response.data.data
}

export async function updateQuestionPaperStatus(
  id: string,
  isActive: boolean,
): Promise<AdminQuestionPaper> {
  const response = await apiClient.patch<ApiEnvelope<AdminQuestionPaper>>(
    endpoints.admin.updateQuestionPaperStatus(id),
    { isActive },
  )
  return response.data.data
}

export async function uploadQuestionPaperFile(
  id: string,
  file: File,
): Promise<AdminQuestionPaper> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<ApiEnvelope<AdminQuestionPaper>>(
    endpoints.admin.questionPaperFile(id),
    formData,
  )
  return response.data.data
}

export async function archiveQuestionPaper(id: string): Promise<AdminQuestionPaper> {
  const response = await apiClient.post<ApiEnvelope<AdminQuestionPaper>>(
    endpoints.admin.archiveQuestionPaper(id),
  )
  return response.data.data
}

export async function restoreQuestionPaper(id: string): Promise<AdminQuestionPaper> {
  const response = await apiClient.post<ApiEnvelope<AdminQuestionPaper>>(
    endpoints.admin.restoreQuestionPaper(id),
  )
  return response.data.data
}
