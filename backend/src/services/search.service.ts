import type { Types } from 'mongoose'

import type { BookmarkContentType } from '../constants/bookmarks'
import type { ExamCategoryCode } from '../constants/exam'
import {
  AUTOCOMPLETE_LIMIT_PER_TYPE,
  POPULAR_SEARCHES_LIMIT,
  RECENT_SEARCHES_LIMIT,
  SEARCH_CONTENT_TYPES,
  SEARCH_FETCH_CAP_PER_TYPE,
  type SearchContentType,
} from '../constants/search'
import type { CurrentAffairDocument } from '../models/CurrentAffair.model'
import type { LessonDocument } from '../models/Lesson.model'
import type { LiveExamDocument } from '../models/LiveExam.model'
import type { QuestionDocument } from '../models/Question.model'
import type { SubjectDocument } from '../models/Subject.model'
import type { SubtopicDocument } from '../models/Subtopic.model'
import type { TopicDocument } from '../models/Topic.model'
import * as bookmarkRepository from '../repositories/bookmark.repository'
import * as searchRepository from '../repositories/search.repository'
import type { Scored } from '../repositories/search.repository'
import * as subjectRepository from '../repositories/subject.repository'
import * as subtopicRepository from '../repositories/subtopic.repository'
import * as topicRepository from '../repositories/topic.repository'
import { ApiError } from '../utils/ApiError'
import {
  escapeRegex,
  pickText,
  resolveExamId,
  type DisplayLanguage,
} from './learn.service'

export interface GlobalSearchResultDTO {
  type: SearchContentType
  id: string
  title: string
  context: string
  deepLink: string
  isBookmarked: boolean
}

export interface GlobalSearchFilter {
  types?: SearchContentType[]
  examCategory?: ExamCategoryCode
}

export interface GlobalSearchPageDTO {
  items: GlobalSearchResultDTO[]
  page: number
  limit: number
  total: number
  totalPages: number
}

type ScoredDoc =
  | { type: 'subject'; score: number; doc: SubjectDocument }
  | { type: 'topic'; score: number; doc: TopicDocument }
  | { type: 'lesson'; score: number; doc: LessonDocument }
  | { type: 'question'; score: number; doc: QuestionDocument }
  | { type: 'current_affair'; score: number; doc: CurrentAffairDocument }
  | { type: 'live_exam'; score: number; doc: LiveExamDocument }

function scoreOf<T>(doc: Scored<T>): number {
  return (doc as { score?: number }).score ?? 0
}

function activeTypes(filter: GlobalSearchFilter): SearchContentType[] {
  return filter.types && filter.types.length > 0
    ? filter.types
    : [...SEARCH_CONTENT_TYPES]
}

/** The `$text`-indexed fan-out (Global Search's main query) — one bounded
 * (`SEARCH_FETCH_CAP_PER_TYPE`) query per requested content type, run in
 * parallel. Cross-collection relevance ranking is then approximated by
 * merging every type's own `textScore` and re-sorting in application code —
 * there's no single MongoDB query that could rank six different
 * collections together, so this scatter-gather-then-merge is the real
 * design, not a shortcut. */
async function fetchScored(
  query: string,
  types: SearchContentType[],
  examId: Types.ObjectId | undefined,
): Promise<ScoredDoc[]> {
  const tasks: Promise<ScoredDoc[]>[] = []

  if (types.includes('subject')) {
    tasks.push(
      searchRepository
        .searchSubjects(query, examId, SEARCH_FETCH_CAP_PER_TYPE)
        .then((docs) =>
          docs.map((doc) => ({ type: 'subject' as const, score: scoreOf(doc), doc })),
        ),
    )
  }
  if (types.includes('topic')) {
    tasks.push(
      searchRepository
        .searchTopics(query, examId, SEARCH_FETCH_CAP_PER_TYPE)
        .then((docs) =>
          docs.map((doc) => ({ type: 'topic' as const, score: scoreOf(doc), doc })),
        ),
    )
  }
  if (types.includes('lesson')) {
    tasks.push(
      searchRepository
        .searchLessons(query, SEARCH_FETCH_CAP_PER_TYPE)
        .then((docs) =>
          docs.map((doc) => ({ type: 'lesson' as const, score: scoreOf(doc), doc })),
        ),
    )
  }
  if (types.includes('question')) {
    tasks.push(
      searchRepository
        .searchQuestions(query, examId, SEARCH_FETCH_CAP_PER_TYPE)
        .then((docs) =>
          docs.map((doc) => ({ type: 'question' as const, score: scoreOf(doc), doc })),
        ),
    )
  }
  if (types.includes('current_affair')) {
    tasks.push(
      searchRepository
        .searchCurrentAffairs(query, SEARCH_FETCH_CAP_PER_TYPE)
        .then((docs) =>
          docs.map((doc) => ({
            type: 'current_affair' as const,
            score: scoreOf(doc),
            doc,
          })),
        ),
    )
  }
  if (types.includes('live_exam')) {
    tasks.push(
      searchRepository
        .searchLiveExams(query, examId, SEARCH_FETCH_CAP_PER_TYPE)
        .then((docs) =>
          docs.map((doc) => ({ type: 'live_exam' as const, score: scoreOf(doc), doc })),
        ),
    )
  }

  const results = await Promise.all(tasks)
  return results.flat()
}

/** Autocomplete's word-prefix fan-out — no relevance score (plain regex),
 * so results stay grouped type-by-type rather than merged/re-sorted. */
async function fetchAutocomplete(
  regex: RegExp,
  types: SearchContentType[],
  examId: Types.ObjectId | undefined,
): Promise<ScoredDoc[]> {
  const tasks: Promise<ScoredDoc[]>[] = []

  if (types.includes('subject')) {
    tasks.push(
      searchRepository
        .autocompleteSubjects(regex, examId, AUTOCOMPLETE_LIMIT_PER_TYPE)
        .then((docs) => docs.map((doc) => ({ type: 'subject' as const, score: 0, doc }))),
    )
  }
  if (types.includes('topic')) {
    tasks.push(
      searchRepository
        .autocompleteTopics(regex, examId, AUTOCOMPLETE_LIMIT_PER_TYPE)
        .then((docs) => docs.map((doc) => ({ type: 'topic' as const, score: 0, doc }))),
    )
  }
  if (types.includes('lesson')) {
    tasks.push(
      searchRepository
        .autocompleteLessons(regex, AUTOCOMPLETE_LIMIT_PER_TYPE)
        .then((docs) => docs.map((doc) => ({ type: 'lesson' as const, score: 0, doc }))),
    )
  }
  if (types.includes('question')) {
    tasks.push(
      searchRepository
        .autocompleteQuestions(regex, examId, AUTOCOMPLETE_LIMIT_PER_TYPE)
        .then((docs) =>
          docs.map((doc) => ({ type: 'question' as const, score: 0, doc })),
        ),
    )
  }
  if (types.includes('current_affair')) {
    tasks.push(
      searchRepository
        .autocompleteCurrentAffairs(regex, AUTOCOMPLETE_LIMIT_PER_TYPE)
        .then((docs) =>
          docs.map((doc) => ({ type: 'current_affair' as const, score: 0, doc })),
        ),
    )
  }
  if (types.includes('live_exam')) {
    tasks.push(
      searchRepository
        .autocompleteLiveExams(regex, examId, AUTOCOMPLETE_LIMIT_PER_TYPE)
        .then((docs) =>
          docs.map((doc) => ({ type: 'live_exam' as const, score: 0, doc })),
        ),
    )
  }

  const results = await Promise.all(tasks)
  return results.flat()
}

interface ParentChain {
  subtopicById: Map<string, SubtopicDocument>
  topicById: Map<string, TopicDocument>
  subjectById: Map<string, SubjectDocument>
}

/** Batch-resolves every parent chain (Subtopic -> Topic -> Subject) a page
 * of results needs for its breadcrumb `context`/`deepLink`, one round-trip
 * per level regardless of how many Lesson/Question/Topic results are on the
 * page — the same "fetch whatever parents aren't already in hand" shape
 * `learn.service.ts`'s own `search()` already uses. */
async function resolveParentChain(scored: ScoredDoc[]): Promise<ParentChain> {
  const subtopicIds = new Set<string>()
  for (const item of scored) {
    if (item.type === 'lesson' || item.type === 'question') {
      subtopicIds.add(item.doc.subtopicId.toString())
    }
  }
  const subtopicById = new Map<string, SubtopicDocument>()
  await Promise.all(
    [...subtopicIds].map(async (id) => {
      const subtopic = await subtopicRepository.findById(id)
      if (subtopic) subtopicById.set(id, subtopic)
    }),
  )

  const topicIds = new Set<string>(
    [...subtopicById.values()].map((s) => s.topicId.toString()),
  )
  const topicById = new Map<string, TopicDocument>()
  await Promise.all(
    [...topicIds].map(async (id) => {
      const topic = await topicRepository.findById(id)
      if (topic) topicById.set(id, topic)
    }),
  )

  const subjectIds = new Set<string>(
    [...subtopicById.values()].map((s) => s.subjectId.toString()),
  )
  for (const item of scored) {
    if (item.type === 'topic') subjectIds.add(item.doc.subjectId.toString())
  }
  const subjectById = new Map<string, SubjectDocument>()
  await Promise.all(
    [...subjectIds].map(async (id) => {
      const subject = await subjectRepository.findById(id)
      if (subject) subjectById.set(id, subject)
    }),
  )

  return { subtopicById, topicById, subjectById }
}

/** `undefined` `userId` (autocomplete's fast, per-keystroke path) always
 * reads as "not bookmarked" rather than issuing a query — the full search
 * results page (which always has a signed-in `userId`) is the one place
 * this actually queries `Bookmark`. */
async function resolveBookmarked(
  userId: string | undefined,
  contentType: BookmarkContentType,
  contentId: Types.ObjectId | string,
): Promise<boolean> {
  if (!userId) return false
  const bookmark = await bookmarkRepository.findOne(userId, contentType, contentId)
  return Boolean(bookmark)
}

async function toDTO(
  item: ScoredDoc,
  userId: string | undefined,
  lang: DisplayLanguage,
  chain: ParentChain,
): Promise<GlobalSearchResultDTO | null> {
  switch (item.type) {
    case 'subject':
      return {
        type: 'subject',
        id: item.doc.slug,
        title: pickText(item.doc.name, lang),
        context: 'Subject',
        deepLink: `/app/learn/${item.doc.slug}`,
        isBookmarked: false,
      }

    case 'topic': {
      const subject = chain.subjectById.get(item.doc.subjectId.toString())
      if (!subject) return null
      return {
        type: 'topic',
        id: item.doc.slug,
        title: pickText(item.doc.name, lang),
        context: pickText(subject.name, lang),
        deepLink: `/app/learn/${subject.slug}/${item.doc.slug}`,
        isBookmarked: false,
      }
    }

    case 'lesson': {
      const subtopic = chain.subtopicById.get(item.doc.subtopicId.toString())
      const topic = subtopic && chain.topicById.get(subtopic.topicId.toString())
      const subject = subtopic && chain.subjectById.get(subtopic.subjectId.toString())
      if (!subtopic || !topic || !subject) return null
      return {
        type: 'lesson',
        id: item.doc.id,
        title: pickText(item.doc.title, lang),
        context: `${pickText(subject.name, lang)} · ${pickText(topic.name, lang)} · ${pickText(subtopic.name, lang)}`,
        deepLink: `/app/learn/${subject.slug}/${topic.slug}/${subtopic.slug}`,
        isBookmarked: await resolveBookmarked(userId, 'lesson', item.doc._id),
      }
    }

    case 'question': {
      const subtopic = chain.subtopicById.get(item.doc.subtopicId.toString())
      const topic = subtopic && chain.topicById.get(subtopic.topicId.toString())
      const subject = subtopic && chain.subjectById.get(subtopic.subjectId.toString())
      if (!subtopic || !topic || !subject) return null
      // Never surface `options`/`isCorrect` here — only the question prompt
      // itself, same answer-leakage rule every pre-answer question read
      // follows elsewhere in this codebase.
      return {
        type: 'question',
        id: item.doc.id,
        title: pickText(item.doc.questionText, lang),
        context: `${pickText(subject.name, lang)} · ${pickText(topic.name, lang)} · ${pickText(subtopic.name, lang)}`,
        deepLink: `/app/practice/quiz?subtopicId=${subtopic.slug}`,
        isBookmarked: await resolveBookmarked(userId, 'question', item.doc._id),
      }
    }

    case 'current_affair':
      return {
        type: 'current_affair',
        id: item.doc.id,
        title: pickText(item.doc.title, lang),
        context: `${item.doc.category} · ${item.doc.date.toISOString().slice(0, 10)}`,
        deepLink: `/app/current-affairs/article/${item.doc.id}`,
        isBookmarked: await resolveBookmarked(userId, 'current_affairs', item.doc._id),
      }

    case 'live_exam':
      return {
        type: 'live_exam',
        id: item.doc.id,
        title: pickText(item.doc.title, lang),
        context: `${item.doc.status} · ${item.doc.scheduledStartAt.toISOString().slice(0, 10)}`,
        deepLink: `/app/live-exams/exam/${item.doc.id}`,
        isBookmarked: false,
      }
  }
}

async function toDTOs(
  scored: ScoredDoc[],
  userId: string | undefined,
  lang: DisplayLanguage,
): Promise<GlobalSearchResultDTO[]> {
  const chain = await resolveParentChain(scored)
  const dtos = await Promise.all(scored.map((item) => toDTO(item, userId, lang, chain)))
  return dtos.filter((dto): dto is GlobalSearchResultDTO => dto !== null)
}

export async function search(
  userId: string,
  rawQuery: string,
  filter: GlobalSearchFilter,
  page: number,
  limit: number,
  lang: DisplayLanguage,
): Promise<GlobalSearchPageDTO> {
  const query = rawQuery.trim()
  const types = activeTypes(filter)
  const examId = await resolveExamId(filter.examCategory)

  const scored = await fetchScored(query, types, examId)
  scored.sort((a, b) => b.score - a.score)

  const total = scored.length
  const start = (page - 1) * limit
  const items = await toDTOs(scored.slice(start, start + limit), userId, lang)

  await searchRepository.touchHistory(userId, query)

  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
}

export async function autocomplete(
  rawQuery: string,
  filter: GlobalSearchFilter,
  lang: DisplayLanguage,
): Promise<GlobalSearchResultDTO[]> {
  const query = rawQuery.trim()
  if (query.length === 0) return []
  const types = activeTypes(filter)
  const examId = await resolveExamId(filter.examCategory)
  const regex = new RegExp(`\\b${escapeRegex(query)}`, 'i')

  const scored = await fetchAutocomplete(regex, types, examId)
  return toDTOs(scored, undefined, lang)
}

export interface RecentSearchDTO {
  query: string
  lastSearchedAt: string
}

export async function getRecentSearches(userId: string): Promise<RecentSearchDTO[]> {
  const items = await searchRepository.findRecentHistory(userId, RECENT_SEARCHES_LIMIT)
  return items.map((item) => ({
    query: item.query,
    lastSearchedAt: item.lastSearchedAt.toISOString(),
  }))
}

export interface PopularSearchDTO {
  query: string
  count: number
}

export function getPopularSearches(): Promise<PopularSearchDTO[]> {
  return searchRepository.findPopularQueries(POPULAR_SEARCHES_LIMIT)
}

export async function removeRecentSearch(userId: string, query: string): Promise<void> {
  const removed = await searchRepository.removeHistoryEntry(userId, query.trim())
  if (!removed) throw ApiError.notFound('Search history entry not found')
}

export async function clearRecentSearches(
  userId: string,
): Promise<{ removedCount: number }> {
  const removedCount = await searchRepository.clearHistory(userId)
  return { removedCount }
}
