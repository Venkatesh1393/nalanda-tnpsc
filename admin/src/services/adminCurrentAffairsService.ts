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

export type CurrentAffairsPeriod = 'daily' | 'weekly' | 'monthly'
export type CurrentAffairsCategory =
  | 'national'
  | 'tamil-nadu'
  | 'economy'
  | 'environment'
  | 'science-tech'
  | 'polity-governance'
  | 'international'
  | 'sports-awards'

export interface QuizOption {
  optionId: string
  text: BilingualText
}

export interface QuizQuestion {
  questionId: string
  questionText: BilingualText
  options: QuizOption[]
  correctOptionId: string
  explanation: BilingualText
}

export type PublishStatus = 'draft' | 'scheduled' | 'published' | 'archived'

export interface AdminCurrentAffair {
  id: string
  date: string
  period: CurrentAffairsPeriod
  category: CurrentAffairsCategory
  title: BilingualText
  excerpt?: BilingualText
  body: BilingualParagraphs
  highlights: BilingualParagraphs
  examRelevanceTags: string[]
  tags: string[]
  isImportant: boolean
  imageUrl?: string
  imageAlt?: string
  quizQuestionIds: string[]
  quizQuestions: QuizQuestion[]
  isActive: boolean
  publishAt: string | null
  publishStatus: PublishStatus
}

export interface CurrentAffairInput {
  date: string
  period: CurrentAffairsPeriod
  category: CurrentAffairsCategory
  title: { en: string; ta?: string }
  excerpt?: { en?: string; ta?: string }
  body: { en: string[]; ta: string[] }
  highlights: { en: string[]; ta: string[] }
  examRelevanceTags: string[]
  tags: string[]
  isImportant: boolean
  quizQuestionIds: string[]
  quizQuestions: QuizQuestion[]
  isActive: boolean
  publishAt?: string
}

export async function listCurrentAffairs(params: {
  search?: string
  period?: CurrentAffairsPeriod
  category?: CurrentAffairsCategory
  status?: 'active' | 'inactive' | 'archived'
  page?: number
  limit?: number
}): Promise<PagedResult<AdminCurrentAffair>> {
  const response = await apiClient.get<ApiEnvelope<AdminCurrentAffair[]>>(
    endpoints.admin.currentAffairs,
    { params },
  )
  return {
    items: response.data.data,
    page: response.data.meta?.page ?? 1,
    limit: response.data.meta?.limit ?? response.data.data.length,
    total: response.data.meta?.total ?? response.data.data.length,
    totalPages: response.data.meta?.totalPages ?? 1,
  }
}

export async function getCurrentAffair(id: string): Promise<AdminCurrentAffair> {
  const response = await apiClient.get<ApiEnvelope<AdminCurrentAffair>>(
    endpoints.admin.currentAffairDetail(id),
  )
  return response.data.data
}

export async function createCurrentAffair(
  input: CurrentAffairInput,
): Promise<AdminCurrentAffair> {
  const response = await apiClient.post<ApiEnvelope<AdminCurrentAffair>>(
    endpoints.admin.currentAffairs,
    input,
  )
  return response.data.data
}

export async function updateCurrentAffair(
  id: string,
  input: Partial<CurrentAffairInput>,
): Promise<AdminCurrentAffair> {
  const response = await apiClient.patch<ApiEnvelope<AdminCurrentAffair>>(
    endpoints.admin.currentAffairDetail(id),
    input,
  )
  return response.data.data
}

/** `isActive: true` = publish (or schedule, if the article's `publishAt` is
 * in the future); `isActive: false` = unpublish. */
export async function updateCurrentAffairStatus(
  id: string,
  isActive: boolean,
): Promise<AdminCurrentAffair> {
  const response = await apiClient.patch<ApiEnvelope<AdminCurrentAffair>>(
    endpoints.admin.updateCurrentAffairStatus(id),
    { isActive },
  )
  return response.data.data
}

export async function archiveCurrentAffair(id: string): Promise<AdminCurrentAffair> {
  const response = await apiClient.post<ApiEnvelope<AdminCurrentAffair>>(
    endpoints.admin.archiveCurrentAffair(id),
  )
  return response.data.data
}

export async function restoreCurrentAffair(id: string): Promise<AdminCurrentAffair> {
  const response = await apiClient.post<ApiEnvelope<AdminCurrentAffair>>(
    endpoints.admin.restoreCurrentAffair(id),
  )
  return response.data.data
}

/** Reuses the existing Step 50 Cloudinary attach/detach route (not under
 * `/admin`) — see `endpoints.admin.currentAffairImage`. */
export async function uploadCurrentAffairImage(
  id: string,
  file: File,
): Promise<AdminCurrentAffair> {
  const formData = new FormData()
  formData.append('image', file)
  const response = await apiClient.post<ApiEnvelope<AdminCurrentAffair>>(
    endpoints.admin.currentAffairImage(id),
    formData,
  )
  return response.data.data
}

export async function removeCurrentAffairImage(id: string): Promise<AdminCurrentAffair> {
  const response = await apiClient.delete<ApiEnvelope<AdminCurrentAffair>>(
    endpoints.admin.currentAffairImage(id),
  )
  return response.data.data
}
