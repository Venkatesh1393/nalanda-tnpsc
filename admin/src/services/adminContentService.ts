import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'

interface ApiEnvelope<T> {
  data: T
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number }
}

export interface BilingualText {
  en?: string
  ta?: string
}

export interface BilingualParagraphs {
  en: string[]
  ta: string[]
}

export type ContentStatus = 'active' | 'inactive' | 'archived'

export interface PagedResult<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

function toPaged<T>(response: { data: ApiEnvelope<T[]> }): PagedResult<T> {
  return {
    items: response.data.data,
    page: response.data.meta?.page ?? 1,
    limit: response.data.meta?.limit ?? response.data.data.length,
    total: response.data.meta?.total ?? response.data.data.length,
    totalPages: response.data.meta?.totalPages ?? 1,
  }
}

// --- Exam --------------------------------------------------------------

export interface AdminExam {
  id: string
  code: string
  name: BilingualText
  description?: BilingualText
  icon?: string
  order: number
  isActive: boolean
}

export interface ExamInput {
  code: string
  name: { en: string; ta?: string }
  description?: { en?: string; ta?: string }
  icon?: string
  order: number
  isActive: boolean
}

export async function listExams(params: {
  search?: string
  status?: 'active' | 'inactive'
  page?: number
  limit?: number
}): Promise<PagedResult<AdminExam>> {
  return toPaged(
    await apiClient.get<ApiEnvelope<AdminExam[]>>(endpoints.admin.exams, { params }),
  )
}

export async function createExam(input: ExamInput): Promise<AdminExam> {
  const response = await apiClient.post<ApiEnvelope<AdminExam>>(
    endpoints.admin.exams,
    input,
  )
  return response.data.data
}

export async function updateExam(
  id: string,
  input: Partial<ExamInput>,
): Promise<AdminExam> {
  const response = await apiClient.patch<ApiEnvelope<AdminExam>>(
    endpoints.admin.examDetail(id),
    input,
  )
  return response.data.data
}

export async function updateExamStatus(
  id: string,
  isActive: boolean,
): Promise<AdminExam> {
  const response = await apiClient.patch<ApiEnvelope<AdminExam>>(
    endpoints.admin.updateExamStatus(id),
    {
      isActive,
    },
  )
  return response.data.data
}

// --- Subject -------------------------------------------------------------

export interface AdminSubject {
  id: string
  slug: string
  name: BilingualText
  examIds: string[]
  order: number
  icon?: string
  isActive: boolean
  status: ContentStatus
}

export interface SubjectInput {
  slug: string
  name: { en: string; ta?: string }
  examIds: string[]
  order: number
  icon?: string
  isActive: boolean
}

export async function listSubjects(params: {
  search?: string
  examId?: string
  status?: ContentStatus
  page?: number
  limit?: number
}): Promise<PagedResult<AdminSubject>> {
  return toPaged(
    await apiClient.get<ApiEnvelope<AdminSubject[]>>(endpoints.admin.subjects, {
      params,
    }),
  )
}

export async function createSubject(input: SubjectInput): Promise<AdminSubject> {
  const response = await apiClient.post<ApiEnvelope<AdminSubject>>(
    endpoints.admin.subjects,
    input,
  )
  return response.data.data
}

export async function updateSubject(
  id: string,
  input: Partial<SubjectInput>,
): Promise<AdminSubject> {
  const response = await apiClient.patch<ApiEnvelope<AdminSubject>>(
    endpoints.admin.subjectDetail(id),
    input,
  )
  return response.data.data
}

export async function updateSubjectStatus(
  id: string,
  isActive: boolean,
): Promise<AdminSubject> {
  const response = await apiClient.patch<ApiEnvelope<AdminSubject>>(
    endpoints.admin.updateSubjectStatus(id),
    { isActive },
  )
  return response.data.data
}

export async function archiveSubject(id: string): Promise<AdminSubject> {
  const response = await apiClient.post<ApiEnvelope<AdminSubject>>(
    endpoints.admin.archiveSubject(id),
  )
  return response.data.data
}

export async function restoreSubject(id: string): Promise<AdminSubject> {
  const response = await apiClient.post<ApiEnvelope<AdminSubject>>(
    endpoints.admin.restoreSubject(id),
  )
  return response.data.data
}

// --- Topic ---------------------------------------------------------------

export interface AdminTopic {
  id: string
  slug: string
  subjectId: string
  examIds: string[]
  name: BilingualText
  order: number
  isActive: boolean
  status: ContentStatus
}

export interface TopicInput {
  slug: string
  subjectId: string
  name: { en: string; ta?: string }
  order: number
  isActive: boolean
}

export async function listTopics(params: {
  search?: string
  subjectId?: string
  status?: ContentStatus
  page?: number
  limit?: number
}): Promise<PagedResult<AdminTopic>> {
  return toPaged(
    await apiClient.get<ApiEnvelope<AdminTopic[]>>(endpoints.admin.topics, { params }),
  )
}

export async function createTopic(input: TopicInput): Promise<AdminTopic> {
  const response = await apiClient.post<ApiEnvelope<AdminTopic>>(
    endpoints.admin.topics,
    input,
  )
  return response.data.data
}

export async function updateTopic(
  id: string,
  input: Partial<TopicInput>,
): Promise<AdminTopic> {
  const response = await apiClient.patch<ApiEnvelope<AdminTopic>>(
    endpoints.admin.topicDetail(id),
    input,
  )
  return response.data.data
}

export async function updateTopicStatus(
  id: string,
  isActive: boolean,
): Promise<AdminTopic> {
  const response = await apiClient.patch<ApiEnvelope<AdminTopic>>(
    endpoints.admin.updateTopicStatus(id),
    {
      isActive,
    },
  )
  return response.data.data
}

export async function archiveTopic(id: string): Promise<AdminTopic> {
  const response = await apiClient.post<ApiEnvelope<AdminTopic>>(
    endpoints.admin.archiveTopic(id),
  )
  return response.data.data
}

export async function restoreTopic(id: string): Promise<AdminTopic> {
  const response = await apiClient.post<ApiEnvelope<AdminTopic>>(
    endpoints.admin.restoreTopic(id),
  )
  return response.data.data
}

// --- Subtopic --------------------------------------------------------------

export interface AdminSubtopic {
  id: string
  slug: string
  topicId: string
  subjectId: string
  examIds: string[]
  name: BilingualText
  order: number
  estimatedMinutes?: number
  isActive: boolean
  status: ContentStatus
}

export interface SubtopicInput {
  slug: string
  topicId: string
  name: { en: string; ta?: string }
  order: number
  estimatedMinutes?: number
  isActive: boolean
}

export async function listSubtopics(params: {
  search?: string
  topicId?: string
  status?: ContentStatus
  page?: number
  limit?: number
}): Promise<PagedResult<AdminSubtopic>> {
  return toPaged(
    await apiClient.get<ApiEnvelope<AdminSubtopic[]>>(endpoints.admin.subtopics, {
      params,
    }),
  )
}

export async function createSubtopic(input: SubtopicInput): Promise<AdminSubtopic> {
  const response = await apiClient.post<ApiEnvelope<AdminSubtopic>>(
    endpoints.admin.subtopics,
    input,
  )
  return response.data.data
}

export async function updateSubtopic(
  id: string,
  input: Partial<SubtopicInput>,
): Promise<AdminSubtopic> {
  const response = await apiClient.patch<ApiEnvelope<AdminSubtopic>>(
    endpoints.admin.subtopicDetail(id),
    input,
  )
  return response.data.data
}

export async function updateSubtopicStatus(
  id: string,
  isActive: boolean,
): Promise<AdminSubtopic> {
  const response = await apiClient.patch<ApiEnvelope<AdminSubtopic>>(
    endpoints.admin.updateSubtopicStatus(id),
    { isActive },
  )
  return response.data.data
}

export async function archiveSubtopic(id: string): Promise<AdminSubtopic> {
  const response = await apiClient.post<ApiEnvelope<AdminSubtopic>>(
    endpoints.admin.archiveSubtopic(id),
  )
  return response.data.data
}

export async function restoreSubtopic(id: string): Promise<AdminSubtopic> {
  const response = await apiClient.post<ApiEnvelope<AdminSubtopic>>(
    endpoints.admin.restoreSubtopic(id),
  )
  return response.data.data
}

// --- Lesson ----------------------------------------------------------------

export interface AdminLesson {
  id: string
  subtopicId: string
  title: BilingualText
  type: string
  order: number
  video?: { cloudinaryAssetId?: string; durationSeconds?: number; thumbnailUrl?: string }
  transcript?: BilingualText
  isPremium: boolean
  isActive: boolean
  status: ContentStatus
}

export interface LessonInput {
  subtopicId: string
  title: { en: string; ta?: string }
  type: 'video' | 'reading' | 'mixed'
  order: number
  video?: { cloudinaryAssetId?: string; durationSeconds?: number; thumbnailUrl?: string }
  transcript?: { en?: string; ta?: string }
  isPremium: boolean
  isActive: boolean
}

export async function listLessons(params: {
  search?: string
  subtopicId?: string
  status?: ContentStatus
  page?: number
  limit?: number
}): Promise<PagedResult<AdminLesson>> {
  return toPaged(
    await apiClient.get<ApiEnvelope<AdminLesson[]>>(endpoints.admin.lessons, { params }),
  )
}

export async function createLesson(input: LessonInput): Promise<AdminLesson> {
  const response = await apiClient.post<ApiEnvelope<AdminLesson>>(
    endpoints.admin.lessons,
    input,
  )
  return response.data.data
}

export async function updateLesson(
  id: string,
  input: Partial<LessonInput>,
): Promise<AdminLesson> {
  const response = await apiClient.patch<ApiEnvelope<AdminLesson>>(
    endpoints.admin.lessonDetail(id),
    input,
  )
  return response.data.data
}

export async function updateLessonStatus(
  id: string,
  isActive: boolean,
): Promise<AdminLesson> {
  const response = await apiClient.patch<ApiEnvelope<AdminLesson>>(
    endpoints.admin.updateLessonStatus(id),
    { isActive },
  )
  return response.data.data
}

export async function archiveLesson(id: string): Promise<AdminLesson> {
  const response = await apiClient.post<ApiEnvelope<AdminLesson>>(
    endpoints.admin.archiveLesson(id),
  )
  return response.data.data
}

export async function restoreLesson(id: string): Promise<AdminLesson> {
  const response = await apiClient.post<ApiEnvelope<AdminLesson>>(
    endpoints.admin.restoreLesson(id),
  )
  return response.data.data
}

// --- StudyMaterial ---------------------------------------------------------
// File upload/replace/remove reuses the existing (non-admin-prefixed) Step
// 50 Cloudinary routes — see `endpoints.admin.studyMaterialFile`.

export interface AdminStudyMaterial {
  id: string
  subtopicId: string
  title: BilingualText
  body: BilingualParagraphs
  type: string
  isPremium: boolean
  version: number
  fileUrl?: string
  fileResourceType?: string
  fileFormat?: string
  fileBytes?: number
  isActive: boolean
  status: ContentStatus
}

export interface StudyMaterialInput {
  subtopicId: string
  title: { en: string; ta?: string }
  body: { en: string[]; ta: string[] }
  type: 'notes' | 'pdf' | 'reference'
  isPremium: boolean
  isActive: boolean
}

export async function listStudyMaterials(params: {
  search?: string
  subtopicId?: string
  status?: ContentStatus
  page?: number
  limit?: number
}): Promise<PagedResult<AdminStudyMaterial>> {
  return toPaged(
    await apiClient.get<ApiEnvelope<AdminStudyMaterial[]>>(
      endpoints.admin.studyMaterials,
      {
        params,
      },
    ),
  )
}

export async function createStudyMaterial(
  input: StudyMaterialInput,
): Promise<AdminStudyMaterial> {
  const response = await apiClient.post<ApiEnvelope<AdminStudyMaterial>>(
    endpoints.admin.studyMaterials,
    input,
  )
  return response.data.data
}

export async function updateStudyMaterial(
  id: string,
  input: Partial<StudyMaterialInput>,
): Promise<AdminStudyMaterial> {
  const response = await apiClient.patch<ApiEnvelope<AdminStudyMaterial>>(
    endpoints.admin.studyMaterialDetail(id),
    input,
  )
  return response.data.data
}

export async function updateStudyMaterialStatus(
  id: string,
  isActive: boolean,
): Promise<AdminStudyMaterial> {
  const response = await apiClient.patch<ApiEnvelope<AdminStudyMaterial>>(
    endpoints.admin.updateStudyMaterialStatus(id),
    { isActive },
  )
  return response.data.data
}

export async function archiveStudyMaterial(id: string): Promise<AdminStudyMaterial> {
  const response = await apiClient.post<ApiEnvelope<AdminStudyMaterial>>(
    endpoints.admin.archiveStudyMaterial(id),
  )
  return response.data.data
}

export async function restoreStudyMaterial(id: string): Promise<AdminStudyMaterial> {
  const response = await apiClient.post<ApiEnvelope<AdminStudyMaterial>>(
    endpoints.admin.restoreStudyMaterial(id),
  )
  return response.data.data
}

export async function uploadStudyMaterialFile(
  id: string,
  file: File,
): Promise<AdminStudyMaterial> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<ApiEnvelope<AdminStudyMaterial>>(
    endpoints.admin.studyMaterialFile(id),
    formData,
  )
  return response.data.data
}

export async function removeStudyMaterialFile(id: string): Promise<AdminStudyMaterial> {
  const response = await apiClient.delete<ApiEnvelope<AdminStudyMaterial>>(
    endpoints.admin.studyMaterialFile(id),
  )
  return response.data.data
}

// --- Cascading pickers — reuses Step 53's question meta endpoints, which
// already expose Exam/Subject/Topic/Subtopic lookups for dropdowns. ---------

export {
  listMetaExams,
  listMetaSubjects,
  listMetaSubtopics,
  listMetaTopics,
  type MetaExam,
  type MetaNode,
} from './adminQuestionsService'
