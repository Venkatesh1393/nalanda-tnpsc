/**
 * Current Affairs module DTOs (docs/InformationArchitecture.md §7.9,
 * docs/Database.md §4.5, docs/API.md §13) — mirrors the `types/learn.ts`
 * convention (one flat, already-decorated type per screen concept; `id`
 * fields are hand-authored slugs, no separate opaque-ID layer since nothing
 * here talks to a real database yet).
 *
 * Distinct from `types/marketing.ts`'s `CurrentAffairsPreviewItem` — that
 * type is the small, public, unauthenticated Landing Page teaser shape
 * (docs/API.md §13's unauthenticated `GET /current-affairs` response); this
 * file is the full, authenticated module's shape (body, highlights,
 * bookmarks, read progress, quiz).
 */

/** Matches `docs/Database.md` §4.5's `period` enum — each entry is
 * authored *as* one of these, not derived: a "weekly digest" is a genuinely
 * different article from seven daily ones, not an aggregation view. */
export type CurrentAffairsPeriod = 'daily' | 'weekly' | 'monthly'

export type CurrentAffairsCategoryId =
  | 'national'
  | 'tamil-nadu'
  | 'economy'
  | 'environment'
  | 'science-tech'
  | 'polity-governance'
  | 'international'
  | 'sports-awards'

export type CurrentAffairsCategory = {
  id: CurrentAffairsCategoryId
  label: string
}

export type CurrentAffairsItem = {
  id: string
  date: string
  period: CurrentAffairsPeriod
  category: CurrentAffairsCategoryId
  title: string
  excerpt: string
  body: string[]
  /** Short, scannable bullet points — the "Important Highlights" callout on
   * the detail screen, distinct from `isImportant` (a feed-level flag for a
   * headline-worthy entry). */
  highlights: string[]
  examRelevanceTags: string[]
  /** A small number of entries are flagged headline-worthy — shown with a
   * distinct badge in the feed, never the majority of entries (an
   * "everything is important" flag would defeat its own purpose). */
  isImportant: boolean
  quizAvailable: boolean
  isBookmarked: boolean
  /** 0-100, from `services/currentAffairsProgressService.ts`, merged in at
   * read time exactly like `LearnSubtopic.isBookmarked`/`isComplete`. */
  readProgressPercent: number
}

export type CurrentAffairsQuizQuestion = {
  id: string
  questionText: string
  options: { id: string; text: string }[]
  correctOptionId: string
  explanation: string
}

export type CurrentAffairsArchiveMonth = {
  /** `YYYY-MM`, used as the filter key and React list key. */
  key: string
  label: string
  count: number
}

export type CurrentAffairsSearchResult = {
  id: string
  title: string
  excerpt: string
  date: string
  category: CurrentAffairsCategoryId
}
