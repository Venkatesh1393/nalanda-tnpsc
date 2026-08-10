/**
 * Learn module DTOs (docs/Learn_Module.md, docs/Database.md §4.2) — one type
 * per collection/screen concept, mirroring the existing `types/dashboard.ts`
 * convention. `id` fields are hand-authored kebab-case slugs (see
 * `utils/slugify.ts`) that double as URL segments — there's no separate
 * opaque-ID layer since nothing here talks to a real database yet.
 */

export type LearnContentType = 'note' | 'video' | 'question' | 'current-affairs'

export type LearnSubject = {
  id: string
  name: string
  /** Looked up in `features/learn/lib/subject-icons.ts` — kept as a plain
   * string here (not a component) per the same reasoning `dashboardService`
   * already uses for widget `type` unions. */
  iconKey: string
  topicCount: number
  /** 0-100, derived from subtopic completion within this subject. */
  progressPercent: number
}

export type LearnTopic = {
  id: string
  subjectId: string
  name: string
  subtopicCount: number
  progressPercent: number
  isComplete: boolean
}

export type LearnSubtopic = {
  id: string
  topicId: string
  subjectId: string
  name: string
  hasVideo: boolean
  hasNotes: boolean
  isBookmarked: boolean
  isComplete: boolean
  estimatedMinutes: number
}

/** The "Lesson Details" screen (between Subtopics and PDF/Video) — the
 * subtopic expanded with its available content entry points and breadcrumb
 * context (docs/Learn_Module.md §3). */
export type LessonDetail = {
  subtopic: LearnSubtopic
  subjectName: string
  topicName: string
  description: string
}

export type VideoLesson = {
  subtopicId: string
  title: string
  durationSeconds: number
  language: 'en' | 'ta'
  hasTranscript: boolean
  isBookmarked: boolean
  /** 0-100 — the signed-in user's resume position for this lesson (Step 45,
   * `LearningProgress.lessons[].progressPercent`), read by
   * `VideoPlayerMock`'s `initialProgressPercent` prop instead of a
   * separate synchronous lookup call. */
  progressPercent: number
}

export type StudyNote = {
  subtopicId: string
  title: string
  paragraphs: string[]
  estimatedReadMinutes: number
  isPremium: boolean
  isBookmarked: boolean
  language: 'en' | 'ta'
}

export type LearnBookmark = {
  id: string
  contentType: LearnContentType
  title: string
  subjectName: string
  topicName: string
  /** Present for note/video bookmarks — lets a Bookmarks card deep-link
   * back into the live Lesson Details screen (docs/Learn_Module.md §7's
   * "pure index, never a duplicated copy" rule). Absent for
   * question/current-affairs bookmarks, which this module doesn't own. */
  subjectId?: string
  topicId?: string
  subtopicId?: string
  personalNote?: string
  createdAt: string
}

export type RevisionSourceType = 'bookmark' | 'wrong-answer' | 'current-affairs'

export type RevisionItem = {
  id: string
  sourceType: RevisionSourceType
  title: string
  subjectName: string
  dueReason: string
  subjectId?: string
  topicId?: string
  subtopicId?: string
}

export type LearnSearchResultType = 'subject' | 'topic' | 'subtopic'

export type LearnSearchResult = {
  type: LearnSearchResultType
  id: string
  label: string
  /** Breadcrumb-style context line, e.g. "General Science > Physics". */
  context: string
  subjectId: string
  topicId?: string
  subtopicId?: string
}
