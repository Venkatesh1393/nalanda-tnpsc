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

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'
export type QuestionType =
  'mcq_single' | 'mcq_multiple' | 'assertion_reason' | 'match_following' | 'true_false'
export type QuestionSource = 'pyq' | 'ai_generated' | 'curated'
export type TnpscExamStage = 'prelims' | 'mains' | 'interview'
export type QuestionStatus = 'active' | 'inactive' | 'archived'

export interface QuestionOption {
  optionId: string
  text: BilingualText
  isCorrect: boolean
}

export interface AdminQuestion {
  id: string
  examIds: string[]
  subjectId: string
  topicId: string
  subtopicId: string
  questionText: BilingualText
  questionImageUrl?: string
  options: QuestionOption[]
  difficulty: QuestionDifficulty
  questionType: QuestionType
  explanation?: BilingualText
  source: QuestionSource
  isPreviousYear: boolean
  pyqYear?: number
  tnpscExamType?: TnpscExamStage
  tags: string[]
  isActive: boolean
  isPremium: boolean
  aiExplanationEligible: boolean
  status: QuestionStatus
  createdAt: string | null
  updatedAt: string | null
}

export interface QuestionListFilter {
  search?: string
  examId?: string
  subjectId?: string
  topicId?: string
  subtopicId?: string
  difficulty?: QuestionDifficulty
  language?: 'en' | 'ta'
  isPreviousYear?: boolean
  status?: QuestionStatus
  page?: number
  limit?: number
}

export interface PagedResult<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export async function listQuestions(
  filter: QuestionListFilter,
): Promise<PagedResult<AdminQuestion>> {
  const response = await apiClient.get<ApiEnvelope<AdminQuestion[]>>(
    endpoints.admin.questions,
    {
      params: filter,
    },
  )
  return {
    items: response.data.data,
    page: response.data.meta?.page ?? 1,
    limit: response.data.meta?.limit ?? response.data.data.length,
    total: response.data.meta?.total ?? response.data.data.length,
    totalPages: response.data.meta?.totalPages ?? 1,
  }
}

export async function getQuestion(id: string): Promise<AdminQuestion> {
  const response = await apiClient.get<ApiEnvelope<AdminQuestion>>(
    endpoints.admin.questionDetail(id),
  )
  return response.data.data
}

export interface QuestionOptionInput {
  optionId: string
  text: { en: string; ta?: string }
  isCorrect: boolean
}

export interface QuestionInput {
  examIds: string[]
  subjectId: string
  topicId: string
  subtopicId: string
  questionText: { en: string; ta?: string }
  questionImageUrl?: string
  options: QuestionOptionInput[]
  difficulty: QuestionDifficulty
  questionType: QuestionType
  explanation?: { en?: string; ta?: string }
  source: QuestionSource
  isPreviousYear: boolean
  pyqYear?: number
  tnpscExamType?: TnpscExamStage
  tags: string[]
  isActive: boolean
  isPremium: boolean
  aiExplanationEligible: boolean
}

export async function createQuestion(input: QuestionInput): Promise<AdminQuestion> {
  const response = await apiClient.post<ApiEnvelope<AdminQuestion>>(
    endpoints.admin.questions,
    input,
  )
  return response.data.data
}

export async function updateQuestion(
  id: string,
  input: Partial<QuestionInput>,
): Promise<AdminQuestion> {
  const response = await apiClient.patch<ApiEnvelope<AdminQuestion>>(
    endpoints.admin.questionDetail(id),
    input,
  )
  return response.data.data
}

export async function updateQuestionStatus(
  id: string,
  isActive: boolean,
): Promise<AdminQuestion> {
  const response = await apiClient.patch<ApiEnvelope<AdminQuestion>>(
    endpoints.admin.updateQuestionStatus(id),
    { isActive },
  )
  return response.data.data
}

export async function archiveQuestion(id: string): Promise<AdminQuestion> {
  const response = await apiClient.post<ApiEnvelope<AdminQuestion>>(
    endpoints.admin.archiveQuestion(id),
  )
  return response.data.data
}

export async function restoreQuestion(id: string): Promise<AdminQuestion> {
  const response = await apiClient.post<ApiEnvelope<AdminQuestion>>(
    endpoints.admin.restoreQuestion(id),
  )
  return response.data.data
}

// --- Cascading filter-dropdown metadata ---

export interface MetaExam {
  id: string
  code: string
  name: BilingualText
}

export interface MetaNode {
  id: string
  slug: string
  name: BilingualText
}

export async function listMetaExams(): Promise<MetaExam[]> {
  const response = await apiClient.get<ApiEnvelope<MetaExam[]>>(
    endpoints.admin.questionMetaExams,
  )
  return response.data.data
}

export async function listMetaSubjects(examId: string): Promise<MetaNode[]> {
  const response = await apiClient.get<ApiEnvelope<MetaNode[]>>(
    endpoints.admin.questionMetaSubjects,
    { params: { examId } },
  )
  return response.data.data
}

export async function listMetaTopics(subjectId: string): Promise<MetaNode[]> {
  const response = await apiClient.get<ApiEnvelope<MetaNode[]>>(
    endpoints.admin.questionMetaTopics,
    { params: { subjectId } },
  )
  return response.data.data
}

export async function listMetaSubtopics(topicId: string): Promise<MetaNode[]> {
  const response = await apiClient.get<ApiEnvelope<MetaNode[]>>(
    endpoints.admin.questionMetaSubtopics,
    { params: { topicId } },
  )
  return response.data.data
}

// --- Bulk Import (Sprint 4 Step 53) ---

export interface ImportRowIssue {
  field: string
  message: string
  suggestion?: string
}

export interface ImportRowPreview {
  questionTextEn: string
  questionTextTa?: string
  examCodes: string[]
  subjectName: string
  topicName: string
  subtopicName: string
  difficulty: string
  optionsCount: number
  correctOptionNumber: number
  isPreviousYear: boolean
}

export type ImportRowDuplicateOf =
  { type: 'file'; rowNumber: number } | { type: 'database'; questionId: string }

export interface ImportRowClientView {
  rowNumber: number
  raw: Record<string, string>
  status: 'valid' | 'invalid' | 'duplicate'
  errors: ImportRowIssue[]
  warnings: string[]
  preview?: ImportRowPreview
  duplicateOf?: ImportRowDuplicateOf
}

export interface ImportPreviewResult {
  fileName: string
  totalRows: number
  validCount: number
  invalidCount: number
  duplicateCount: number
  rows: ImportRowClientView[]
}

export interface ImportConfirmResult {
  insertedCount: number
  skippedCount: number
  failures: { rowNumber: number; message: string }[]
}

/** Preview never writes to MongoDB — the same `file` is re-uploaded again
 * for `confirmImport` rather than trusting a client-held resolved payload,
 * so nothing about this call needs to be remembered server-side either. */
export async function previewImport(file: File): Promise<ImportPreviewResult> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<ApiEnvelope<ImportPreviewResult>>(
    endpoints.admin.questionImportPreview,
    formData,
  )
  return response.data.data
}

export async function confirmImport(
  file: File,
  rowNumbers: number[],
): Promise<ImportConfirmResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('rowNumbers', JSON.stringify(rowNumbers))
  const response = await apiClient.post<ApiEnvelope<ImportConfirmResult>>(
    endpoints.admin.questionImportConfirm,
    formData,
  )
  return response.data.data
}

/** Downloaded as a blob (not a plain `<a href>`) because this route requires
 * the same in-memory Bearer JWT every other admin call uses — a direct
 * browser navigation would carry no Authorization header at all. */
export async function downloadImportTemplate(format: 'csv' | 'xlsx'): Promise<void> {
  const response = await apiClient.get<Blob>(endpoints.admin.questionImportTemplate, {
    params: { format },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download =
    format === 'xlsx' ? 'question-import-template.xlsx' : 'question-import-template.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
