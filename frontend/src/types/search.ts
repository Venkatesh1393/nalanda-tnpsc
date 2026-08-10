/**
 * Sprint 4 Step 63 — Global Search. Mirrors the backend's
 * `GlobalSearchResultDTO` (`backend/src/services/search.service.ts`) field
 * for field.
 */
export const SEARCH_CONTENT_TYPES = [
  'subject',
  'topic',
  'lesson',
  'question',
  'current_affair',
  'live_exam',
] as const
export type SearchContentType = (typeof SEARCH_CONTENT_TYPES)[number]

export type GlobalSearchResult = {
  type: SearchContentType
  id: string
  title: string
  /** Breadcrumb-style context line, e.g. "Physics · Motion · Newton's Laws". */
  context: string
  deepLink: string
  isBookmarked: boolean
}

export type GlobalSearchPage = {
  items: GlobalSearchResult[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type RecentSearch = {
  query: string
  lastSearchedAt: string
}

export type PopularSearch = {
  query: string
  count: number
}
