import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  LearnSearchResult,
  LearnSubject,
  LearnSubtopic,
  LearnTopic,
  LessonDetail,
  StudyNote,
  VideoLesson,
} from '@/types/learn'

/**
 * The Learn module's real domain facade (Step 45) — backed by
 * `backend/src/routes/subjects.routes.ts`/`learn.routes.ts`. Every function
 * keeps the exact signature its `features/learn/`/`pages/learn/` callers
 * already use — this is a facade-body swap, not a UI change. `subjectId`/
 * `topicId`/`subtopicId` are always real Mongo `slug`s (never raw
 * ObjectIds), so every existing `ROUTES.learn*` URL keeps working.
 */

export type SubtopicLocation = {
  subjectId: string
  subjectName: string
  topicId: string
  topicName: string
}

type BackendSubjectDTO = Omit<LearnSubject, 'iconKey'> & { icon: string | null }

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const response = await apiClient.get<{ data: T }>(path, { params })
  return response.data.data
}

export async function getSubjects(): Promise<LearnSubject[]> {
  const subjects = await get<BackendSubjectDTO[]>(endpoints.subjects.list)
  return subjects.map(({ icon, ...rest }) => ({ ...rest, iconKey: icon ?? 'book-open' }))
}

export async function getTopics(subjectId: string): Promise<LearnTopic[]> {
  return get<LearnTopic[]>(endpoints.subjects.topics(subjectId))
}

export async function getSubtopics(
  subjectId: string,
  topicId: string,
): Promise<LearnSubtopic[]> {
  return get<LearnSubtopic[]>(endpoints.subjects.subtopics(subjectId, topicId))
}

export async function findSubtopicLocation(
  subtopicId: string,
): Promise<SubtopicLocation | null> {
  return get<SubtopicLocation | null>(endpoints.learn.subtopicLocation(subtopicId))
}

export async function getLessonDetail(
  subjectId: string,
  topicId: string,
  subtopicId: string,
): Promise<LessonDetail | null> {
  return get<LessonDetail | null>(
    endpoints.subjects.lessonDetail(subjectId, topicId, subtopicId),
  )
}

export async function getVideoLesson(
  subjectId: string,
  topicId: string,
  subtopicId: string,
): Promise<VideoLesson | null> {
  return get<VideoLesson | null>(endpoints.subjects.video(subjectId, topicId, subtopicId))
}

export async function getStudyNotes(
  subjectId: string,
  topicId: string,
  subtopicId: string,
): Promise<StudyNote | null> {
  return get<StudyNote | null>(endpoints.subjects.notes(subjectId, topicId, subtopicId))
}

export async function searchLearnContent(query: string): Promise<LearnSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  return get<LearnSearchResult[]>(endpoints.learn.search, { q: trimmed })
}
