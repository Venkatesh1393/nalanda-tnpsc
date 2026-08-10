import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  LiveExamAttemptState,
  LiveExamDetail,
  LiveExamListItem,
  LiveExamResult,
  LiveExamTab,
  MyLiveExamAttempt,
} from '@/types/liveExam'

/**
 * The real Weekly Live Exam data layer (Step 48) — no mock precedent
 * exists for this module (`features/live-exams/` was an empty scaffold
 * until now), so unlike Learn/Practice this was never a facade over
 * `services/mock/`; every function here calls the live backend directly.
 */

export async function getLiveExams(tab: LiveExamTab): Promise<LiveExamListItem[]> {
  const response = await apiClient.get<{ data: LiveExamListItem[] }>(
    endpoints.liveExams.list,
    { params: { tab } },
  )
  return response.data.data
}

export async function getLiveExamDetail(liveExamId: string): Promise<LiveExamDetail> {
  const response = await apiClient.get<{ data: LiveExamDetail }>(
    endpoints.liveExams.detail(liveExamId),
  )
  return response.data.data
}

/** "Join" and "Start" are the same call — idempotent, resumes an existing
 * in-progress attempt if one exists. */
export async function joinLiveExam(liveExamId: string): Promise<LiveExamAttemptState> {
  const response = await apiClient.post<{ data: LiveExamAttemptState }>(
    endpoints.liveExams.join(liveExamId),
  )
  return response.data.data
}

export async function getLiveExamAttempt(
  liveExamId: string,
): Promise<LiveExamAttemptState> {
  const response = await apiClient.get<{ data: LiveExamAttemptState }>(
    endpoints.liveExams.attempt(liveExamId),
  )
  return response.data.data
}

export type SaveLiveExamAnswerInput = {
  questionId: string
  selectedOptionId?: string | null
  markedForReview?: boolean
}

export async function saveLiveExamAnswer(
  liveExamId: string,
  input: SaveLiveExamAnswerInput,
): Promise<{ saved: true; savedAt: string }> {
  const response = await apiClient.post<{ data: { saved: true; savedAt: string } }>(
    endpoints.liveExams.answer(liveExamId),
    input,
  )
  return response.data.data
}

export async function finishLiveExam(
  liveExamId: string,
): Promise<{ attemptId: string; status: 'submitted'; submittedAt: string }> {
  const response = await apiClient.post<{
    data: { attemptId: string; status: 'submitted'; submittedAt: string }
  }>(endpoints.liveExams.finish(liveExamId))
  return response.data.data
}

export async function getLiveExamResult(liveExamId: string): Promise<LiveExamResult> {
  const response = await apiClient.get<{ data: LiveExamResult }>(
    endpoints.liveExams.result(liveExamId),
  )
  return response.data.data
}

export async function getMyLiveExamAttempts(): Promise<MyLiveExamAttempt[]> {
  const response = await apiClient.get<{ data: MyLiveExamAttempt[] }>(
    endpoints.liveExams.myAttempts,
  )
  return response.data.data
}
