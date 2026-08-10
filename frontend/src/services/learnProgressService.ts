import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  LearnBookmark,
  LearnContentType,
  RevisionItem,
  RevisionSourceType,
} from '@/types/learn'

/**
 * The stateful half of the Learn module. Step 45 made subtopic progress
 * (completion, video-watch tracking, last-visited/"Continue Learning") and
 * note/video bookmarks all real, backed by `LearningProgress`/`Bookmark` in
 * MongoDB (`backend/src/services/learningProgress.service.ts`/
 * `bookmark.service.ts`) — every function below keeps its exact prior
 * signature (mutations were already `async`; the handful of previously-
 * synchronous readers this file used to export, `isSubtopicComplete`/
 * `getVideoProgressPercent`/`getNotesProgressPercent`, had no callers left
 * once `services/learnService.ts` started reading these values embedded in
 * its own already-async responses instead — removed as dead code, not
 * replaced).
 *
 * Current Affairs bookmarks are real too as of the Current Affairs backend
 * step (`contentType: 'current_affairs'`, a direct `Bookmark.contentId`
 * reference exactly like `question`, since a `CurrentAffair` has no Learn
 * subtopic slug to resolve through). Practice question bookmarks for the
 * still-mocked Sectional/Mock/PYQ/100 Questions modes are the one remaining
 * `localStorage`-backed bucket below (their `q-...` ids never match a real
 * Mongo ObjectId, so they can't route to the backend even if they wanted to).
 */

const STORAGE_KEY = 'nalanda-learn-progress'
const REVISION_QUEUE_CAP = 8

type StoredMockBookmarks = {
  /** Only ever holds `'question'`/`'current-affairs'` entries now —
   * `toggleBookmark` never writes a `'video'`/`'note'` entry here again. */
  bookmarks: LearnBookmark[]
  resolvedRevisionIds: string[]
}

function emptyState(): StoredMockBookmarks {
  return { bookmarks: [], resolvedRevisionIds: [] }
}

function readState(): StoredMockBookmarks {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyState()
  try {
    return { ...emptyState(), ...(JSON.parse(raw) as Partial<StoredMockBookmarks>) }
  } catch {
    return emptyState()
  }
}

function writeState(state: StoredMockBookmarks): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function bookmarkId(subtopicId: string, contentType: LearnContentType): string {
  return `${contentType}-${subtopicId}`
}

function isLearnContentType(
  contentType: LearnContentType,
): contentType is 'video' | 'note' {
  return contentType === 'video' || contentType === 'note'
}

function toBackendContentType(
  contentType: 'video' | 'note',
): 'lesson' | 'study_material' {
  return contentType === 'video' ? 'lesson' : 'study_material'
}

function fromBackendContentType(
  contentType: 'lesson' | 'study_material',
): LearnContentType {
  return contentType === 'lesson' ? 'video' : 'note'
}

/** A real bookmark/question/etc. id is always a 24-character hex Mongo
 * ObjectId; every mock id (the composite `${contentType}-${subtopicId}`
 * bookmark keys, the mock question bank's `q-...` ids) is a different,
 * human-readable format that never collides with that. */
function isRealObjectId(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id)
}

const isRealBookmarkId = isRealObjectId

/** Step 46 — real Smart Practice question bookmarks (`Question._id`s,
 * always real ObjectIds) now go through the live `Bookmark` collection;
 * the still-mocked Sectional/Mock/PYQ/100 Questions modes' question ids
 * (`q-...`) never match this and keep using the `localStorage` bucket
 * below unchanged. */
function isRealQuestionBookmark(
  subtopicId: string,
  contentType: LearnContentType,
): boolean {
  return contentType === 'question' && isRealObjectId(subtopicId)
}

/** Current Affairs backend step — every article now has a real Mongo id
 * (no mock fallback remains for this content type at all), so unlike
 * `question` above this never needs an id-shape check. */
function isCurrentAffairsBookmark(contentType: LearnContentType): boolean {
  return contentType === 'current-affairs'
}

/** In-memory only — primed by `services/practiceSessionService.ts`'s
 * review fetch (which already knows each question's real bookmark state
 * from the backend) and updated on every real-question toggle. A freshly
 * started live-session question defaults to "not bookmarked" until either
 * toggled or a Review fetch primes it — an accepted, minor scope trim
 * (Step 46 didn't ask for live-session bookmark pre-loading), not a
 * correctness bug. */
const realQuestionBookmarkState = new Map<string, boolean>()

export function primeQuestionBookmarkState(
  questionId: string,
  bookmarked: boolean,
): void {
  realQuestionBookmarkState.set(questionId, bookmarked)
}

// ---- Still-mocked reader (Sectional/Mock/PYQ/100 Questions' question
// bookmarks only now — video/note/current-affairs bookmarking all read
// their `isBookmarked` flag embedded directly in the relevant real API
// response instead) ----

export function isContentBookmarked(
  subtopicId: string,
  contentType: LearnContentType,
): boolean {
  if (isRealQuestionBookmark(subtopicId, contentType)) {
    return realQuestionBookmarkState.get(subtopicId) ?? false
  }
  return readState().bookmarks.some((b) => b.id === bookmarkId(subtopicId, contentType))
}

// ---- Real learning progress (Step 45) ----

async function patchProgress(
  subtopicId: string,
  body: Record<string, unknown>,
): Promise<void> {
  await apiClient.patch(endpoints.learningProgress.update(subtopicId), body)
}

/** Records that the user opened a Lesson Details/Video/Notes screen — powers
 * Learn's own "Continue Learning" banner. Fire-and-forget from the caller's
 * perspective (no loading/error UI needed for a page-view side effect), but
 * a real network call now, not a `localStorage` write. */
export async function recordSubtopicVisit(
  _subjectId: string,
  _topicId: string,
  subtopicId: string,
): Promise<void> {
  await patchProgress(subtopicId, {})
}

export async function markSubtopicComplete(subtopicId: string): Promise<void> {
  await patchProgress(subtopicId, { status: 'completed' })
}

export async function markSubtopicIncomplete(subtopicId: string): Promise<void> {
  await patchProgress(subtopicId, { status: 'not_started' })
}

export async function updateVideoProgress(
  subtopicId: string,
  percent: number,
): Promise<void> {
  await patchProgress(subtopicId, { lesson: { progressPercent: percent } })
}

/** Notes progress is a client-only reading-position nicety — Step 45
 * deliberately doesn't persist a duplicate notes-read percentage
 * server-side (completion there is always the explicit "Mark as Read"
 * action instead, via `markSubtopicComplete`). Still touches
 * `lastAccessedAt` so scrolling through notes counts as a visit. */
export async function updateNotesProgress(
  subtopicId: string,
  _percent: number,
): Promise<void> {
  await patchProgress(subtopicId, {})
}

export type LastVisited = {
  subjectId: string
  topicId: string
  subtopicId: string
  visitedAt: string
}

export async function getLastVisited(): Promise<LastVisited | null> {
  const response = await apiClient.get<{ data: LastVisited | null }>(
    endpoints.learningProgress.lastVisited,
  )
  return response.data.data
}

// ---- Bookmarks — hybrid: real for Learn content (video/note), mocked for
// Practice questions/Current Affairs (neither has a real backend yet) ----

export type ToggleBookmarkInput = {
  /** For non-Learn content (e.g. Practice questions), pass a unique id for
   * the bookmarked item — it's only used as the bookmark's dedupe key here,
   * not assumed to be a real Learn subtopic slug. */
  subtopicId: string
  contentType: LearnContentType
  title: string
  subjectName: string
  topicName: string
  /** Omit for content with no Learn hierarchy home (e.g. a bookmarked
   * Practice question) — `features/learn/components/bookmarks-list.tsx`
   * only deep-links back into Learn when all three of subjectId/topicId/
   * subtopicId are present, so an omitted pair simply renders as a
   * non-interactive bookmark card rather than a broken link. */
  subjectId?: string
  topicId?: string
}

/** Returns the new bookmarked state (true = now bookmarked). */
export async function toggleBookmark(input: ToggleBookmarkInput): Promise<boolean> {
  if (isLearnContentType(input.contentType)) {
    const response = await apiClient.post<{ data: { bookmarked: boolean } }>(
      endpoints.bookmarks.toggle,
      {
        subtopicSlug: input.subtopicId,
        contentType: toBackendContentType(input.contentType),
      },
    )
    return response.data.data.bookmarked
  }

  if (isRealQuestionBookmark(input.subtopicId, input.contentType)) {
    const response = await apiClient.post<{ data: { bookmarked: boolean } }>(
      endpoints.bookmarks.toggle,
      { contentType: 'question', questionId: input.subtopicId },
    )
    const bookmarked = response.data.data.bookmarked
    realQuestionBookmarkState.set(input.subtopicId, bookmarked)
    return bookmarked
  }

  if (isCurrentAffairsBookmark(input.contentType)) {
    const response = await apiClient.post<{ data: { bookmarked: boolean } }>(
      endpoints.bookmarks.toggle,
      { contentType: 'current_affairs', currentAffairId: input.subtopicId },
    )
    return response.data.data.bookmarked
  }

  const state = readState()
  const id = bookmarkId(input.subtopicId, input.contentType)
  const existingIndex = state.bookmarks.findIndex((b) => b.id === id)

  let nowBookmarked: boolean
  if (existingIndex >= 0) {
    state.bookmarks.splice(existingIndex, 1)
    nowBookmarked = false
  } else {
    state.bookmarks.unshift({
      id,
      contentType: input.contentType,
      title: input.title,
      subjectName: input.subjectName,
      topicName: input.topicName,
      subjectId: input.subjectId,
      topicId: input.topicId,
      subtopicId: input.subtopicId,
      createdAt: new Date().toISOString(),
    })
    nowBookmarked = true
  }
  writeState(state)
  await delay(undefined, 200)
  return nowBookmarked
}

export async function removeBookmark(bookmarkIdToRemove: string): Promise<void> {
  if (isRealBookmarkId(bookmarkIdToRemove)) {
    await apiClient.delete(endpoints.bookmarks.remove(bookmarkIdToRemove))
    return
  }
  const state = readState()
  state.bookmarks = state.bookmarks.filter((b) => b.id !== bookmarkIdToRemove)
  writeState(state)
  await delay(undefined, 200)
}

type BackendBookmarkContentType =
  'lesson' | 'study_material' | 'question' | 'current_affairs'

function fromAnyBackendContentType(
  contentType: BackendBookmarkContentType,
): LearnContentType {
  if (contentType === 'question') return 'question'
  if (contentType === 'current_affairs') return 'current-affairs'
  return fromBackendContentType(contentType)
}

async function getRealBookmarks(
  contentType?: 'video' | 'note' | 'question' | 'current-affairs',
): Promise<LearnBookmark[]> {
  const backendContentType: BackendBookmarkContentType | undefined =
    contentType === 'question' || contentType === 'current-affairs'
      ? contentType === 'current-affairs'
        ? 'current_affairs'
        : contentType
      : contentType && toBackendContentType(contentType)
  const response = await apiClient.get<{
    data: (Omit<LearnBookmark, 'contentType'> & {
      contentType: BackendBookmarkContentType
    })[]
  }>(endpoints.bookmarks.list, {
    params: backendContentType ? { contentType: backendContentType } : undefined,
  })
  return response.data.data.map((b) => ({
    ...b,
    contentType: fromAnyBackendContentType(b.contentType),
  }))
}

export async function getBookmarks(filter?: LearnContentType): Promise<LearnBookmark[]> {
  const includeRealLearn = !filter || isLearnContentType(filter)
  // Real question bookmarks (Step 46) live alongside the still-mocked
  // Sectional/Mock/PYQ/100-Questions question bookmarks below — both
  // buckets are merged whenever the caller wants 'question' content (or
  // everything), since either mode's questions can be bookmarked.
  const includeRealQuestions = !filter || filter === 'question'
  const includeRealCurrentAffairs = !filter || filter === 'current-affairs'
  // Current Affairs is fully real now — the mock bucket only ever holds
  // leftover mock question ids (Sectional/Mock/PYQ/100 Questions) going
  // forward, but is still checked on an unfiltered fetch for backward
  // compatibility with anything written before this change.
  const includeMock = !filter || filter === 'question'

  const [realLearn, realQuestions, realCurrentAffairs, mock] = await Promise.all([
    includeRealLearn
      ? getRealBookmarks(filter && isLearnContentType(filter) ? filter : undefined)
      : Promise.resolve([]),
    includeRealQuestions ? getRealBookmarks('question') : Promise.resolve([]),
    includeRealCurrentAffairs ? getRealBookmarks('current-affairs') : Promise.resolve([]),
    includeMock
      ? delay(
          readState().bookmarks.filter((b) => !filter || b.contentType === filter),
          300,
        )
      : Promise.resolve([]),
  ])

  return [...realLearn, ...realQuestions, ...realCurrentAffairs, ...mock].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
}

// ---- Revision queue (docs/Learn_Module.md §8) — still fully mocked, no
// backend model exists for this at all (out of Step 45's scope); now reads
// bookmarks through the hybrid `getBookmarks()` above so a real video/note
// bookmark still surfaces here, not just the legacy localStorage ones. ----

const MOCK_WRONG_ANSWER_SEEDS: RevisionItem[] = [
  {
    id: 'revision-seed-1',
    sourceType: 'wrong-answer',
    title: 'Modern Periodic Table — group trends',
    subjectName: 'General Science',
    dueReason: "You missed this in yesterday's Topic Quiz",
  },
  {
    id: 'revision-seed-2',
    sourceType: 'wrong-answer',
    title: 'Percentage — successive change problems',
    subjectName: 'Aptitude',
    dueReason: 'Incorrect twice in your last 3 attempts',
  },
  {
    id: 'revision-seed-3',
    sourceType: 'current-affairs',
    title: 'RBI repo rate policy — key figures',
    subjectName: 'Current Affairs',
    dueReason: 'Tagged relevant to your weak areas',
  },
]

function bookmarkToRevisionItem(bookmark: LearnBookmark): RevisionItem {
  return {
    id: `revision-${bookmark.id}`,
    sourceType: 'bookmark' as RevisionSourceType,
    title: bookmark.title,
    subjectName: bookmark.subjectName,
    dueReason: 'Bookmarked, not yet revisited',
    subjectId: bookmark.subjectId,
    topicId: bookmark.topicId,
    subtopicId: bookmark.subtopicId,
  }
}

export async function getRevisionQueue(): Promise<RevisionItem[]> {
  const [allBookmarks, { resolvedRevisionIds }] = await Promise.all([
    getBookmarks(),
    Promise.resolve(readState()),
  ])
  const fromBookmarks = allBookmarks
    .filter((b) => b.contentType === 'note' || b.contentType === 'video')
    .map(bookmarkToRevisionItem)

  const candidates = [...fromBookmarks, ...MOCK_WRONG_ANSWER_SEEDS].filter(
    (item) => !resolvedRevisionIds.includes(item.id),
  )

  // Bounded, prioritized queue (docs/Learn_Module.md §8's "cap and
  // prioritize rather than surface everything technically due").
  return candidates.slice(0, REVISION_QUEUE_CAP)
}

export async function submitRevisionResponse(
  itemId: string,
  _response: 'got-it' | 'still-unsure',
): Promise<void> {
  const state = readState()
  if (!state.resolvedRevisionIds.includes(itemId)) {
    state.resolvedRevisionIds.push(itemId)
    writeState(state)
  }
  await delay(undefined, 250)
}
