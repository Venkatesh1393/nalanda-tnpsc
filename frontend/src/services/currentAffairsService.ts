import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import { getReadProgressPercent } from '@/services/currentAffairsProgressService'
import type { CurrentAffairsPreviewItem } from '@/types/marketing'
import type {
  CurrentAffairsArchiveMonth,
  CurrentAffairsItem,
  CurrentAffairsPeriod,
  CurrentAffairsQuizQuestion,
  CurrentAffairsSearchResult,
} from '@/types/currentAffairs'

/**
 * Domain calls for the real Current Affairs backend
 * (`backend/src/routes/currentAffairs.routes.ts`) — every function below
 * now calls a live, MongoDB-backed endpoint, replacing
 * `services/mock/currentAffairsMockService.ts`. This is the same stable
 * facade every component already imports from — no component/type shape
 * changed. `readProgressPercent` stays a purely local concept (no backend
 * store for it — an explicitly out-of-scope field for this step) and is
 * merged in here exactly like the old mock's `decorate()` did, keyed by the
 * article's now-real id.
 */

interface ApiEnvelope<T> {
  data: T
}

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get<ApiEnvelope<T>>(url, { params })
  return response.data.data
}

interface ApiCurrentAffairItem extends Omit<CurrentAffairsItem, 'readProgressPercent'> {
  imageUrl: string | null
  imageAlt: string | null
  tags: string[]
}

function decorate(item: ApiCurrentAffairItem): CurrentAffairsItem {
  return { ...item, readProgressPercent: getReadProgressPercent(item.id) }
}

export async function getCurrentAffairsPreview(
  limit = 5,
): Promise<CurrentAffairsPreviewItem[]> {
  return get<CurrentAffairsPreviewItem[]>(endpoints.currentAffairs.preview, { limit })
}

export type CurrentAffairsListFilters = {
  period: CurrentAffairsPeriod
  category?: string
  month?: string
}

export async function getCurrentAffairsList(
  filters: CurrentAffairsListFilters,
): Promise<CurrentAffairsItem[]> {
  const items = await get<ApiCurrentAffairItem[]>(endpoints.currentAffairs.list, {
    period: filters.period,
    category: filters.category,
    month: filters.month,
    limit: 50,
  })
  return items.map(decorate)
}

export async function getCurrentAffairsDetail(
  id: string,
): Promise<CurrentAffairsItem | null> {
  try {
    const item = await get<ApiCurrentAffairItem>(endpoints.currentAffairs.detail(id))
    return decorate(item)
  } catch {
    return null
  }
}

export async function getCurrentAffairsQuiz(
  id: string,
): Promise<CurrentAffairsQuizQuestion[]> {
  return get<CurrentAffairsQuizQuestion[]>(endpoints.currentAffairs.quiz(id))
}

export async function searchCurrentAffairs(
  query: string,
): Promise<CurrentAffairsSearchResult[]> {
  if (query.trim().length < 2) return []
  return get<CurrentAffairsSearchResult[]>(endpoints.currentAffairs.search, { q: query })
}

export async function getArchiveMonths(): Promise<CurrentAffairsArchiveMonth[]> {
  return get<CurrentAffairsArchiveMonth[]>(endpoints.currentAffairs.archiveMonths)
}

export async function getArchiveForMonth(month: string): Promise<CurrentAffairsItem[]> {
  const items = await get<ApiCurrentAffairItem[]>(
    endpoints.currentAffairs.archiveForMonth(month),
  )
  return items.map(decorate)
}
