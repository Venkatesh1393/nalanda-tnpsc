/**
 * Sprint 4 Step 63 — Global Search. The six content types this step's spec
 * names explicitly, in the fixed display order every grouped result list
 * (autocomplete dropdown, results page) uses.
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

export const RECENT_SEARCHES_LIMIT = 10
export const POPULAR_SEARCHES_LIMIT = 10
export const AUTOCOMPLETE_LIMIT_PER_TYPE = 5
/** How many candidates are pulled per content type before merging by text
 * relevance and paginating — generous enough to fill a few pages of mixed
 * results without fetching a whole collection. */
export const SEARCH_FETCH_CAP_PER_TYPE = 40
