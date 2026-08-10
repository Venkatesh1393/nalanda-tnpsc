import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { ExamCategoryId } from '@/constants/exam'
import type {
  GlobalSearchPage,
  GlobalSearchResult,
  PopularSearch,
  RecentSearch,
  SearchContentType,
} from '@/types/search'

/**
 * Domain calls for the real Global Search backend
 * (`backend/src/routes/search.routes.ts`, Sprint 4 Step 63).
 */

interface ApiEnvelope<T> {
  data: T
  meta?: { page: number; limit: number; total: number; totalPages: number }
}

export type GlobalSearchFilters = {
  types?: SearchContentType[]
  examCategory?: ExamCategoryId
}

export async function globalSearch(
  query: string,
  filters: GlobalSearchFilters = {},
  page = 1,
  limit = 20,
): Promise<GlobalSearchPage> {
  const response = await apiClient.get<ApiEnvelope<GlobalSearchResult[]>>(
    endpoints.search.root,
    {
      params: {
        q: query,
        types: filters.types,
        examCategory: filters.examCategory,
        page,
        limit,
      },
    },
  )
  return {
    items: response.data.data,
    page: response.data.meta?.page ?? page,
    limit: response.data.meta?.limit ?? limit,
    total: response.data.meta?.total ?? response.data.data.length,
    totalPages: response.data.meta?.totalPages ?? 1,
  }
}

export async function autocompleteSearch(
  query: string,
  filters: GlobalSearchFilters = {},
): Promise<GlobalSearchResult[]> {
  if (query.trim().length === 0) return []
  const response = await apiClient.get<ApiEnvelope<GlobalSearchResult[]>>(
    endpoints.search.autocomplete,
    { params: { q: query, types: filters.types, examCategory: filters.examCategory } },
  )
  return response.data.data
}

export async function getRecentSearches(): Promise<RecentSearch[]> {
  const response = await apiClient.get<ApiEnvelope<RecentSearch[]>>(
    endpoints.search.recentHistory,
  )
  return response.data.data
}

export async function getPopularSearches(): Promise<PopularSearch[]> {
  const response = await apiClient.get<ApiEnvelope<PopularSearch[]>>(
    endpoints.search.popularHistory,
  )
  return response.data.data
}

export async function removeRecentSearch(query: string): Promise<void> {
  await apiClient.delete(endpoints.search.removeHistory, { params: { query } })
}

export async function clearRecentSearches(): Promise<void> {
  await apiClient.delete(endpoints.search.clearHistory)
}
