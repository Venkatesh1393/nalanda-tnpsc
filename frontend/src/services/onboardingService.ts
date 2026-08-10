import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { OnboardingData, OnboardingStateResponse } from '@/features/onboarding/types'

export type StudyPlanResult = {
  planId: string
  planVersion: number
  examCategories: OnboardingData['examCategories']
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mocked `POST /study-plans` (docs/API.md §12) — no backend or AI
 * Orchestration Service exists yet (docs/Architecture.md §5,
 * docs/MASTER_ROADMAP.md Phase 5/12 both "Not started"), so this simulates
 * the generation latency instead of calling `apiClient`. Swap this
 * function's body for a real call later; `GeneratePlanStep` doesn't need to
 * change — it already handles both the success and thrown-error paths.
 * Deliberately left mocked by this session's Step 44 (User/Profile/
 * Onboarding/Dashboard backend integration) — see `getOnboardingState`/
 * `saveOnboardingDraft`/`completeOnboarding` below for what *is* now real.
 */
export async function generateStudyPlan(data: OnboardingData): Promise<StudyPlanResult> {
  await delay(2200)
  return {
    planId: 'mock-plan-1',
    planVersion: 1,
    examCategories: data.examCategories,
  }
}

/** A `PATCH /onboarding` (draft-save) or `POST /onboarding/complete` body
 * can't carry `language: null` — `User.languagePreference` always has a
 * real default ('bilingual'), so the backend schema treats an omitted
 * `language` as "leave it unchanged," not "clear it." Every other field is
 * nullable server-side, so those pass through as-is. */
function sanitizeDraftPatch(patch: Partial<OnboardingData>): Record<string, unknown> {
  const { language, ...rest } = patch
  return language === null || language === undefined ? rest : { ...rest, language }
}

/** Backs the wizard's initial load (Step 44 §B "Refresh must NOT lose
 * onboarding information") — the real, persisted draft/completion state,
 * read from `Profile.onboarding` (+`User.languagePreference`). */
export async function getOnboardingState(): Promise<OnboardingStateResponse> {
  const response = await apiClient.get<{ data: OnboardingStateResponse }>(
    endpoints.onboarding.get,
  )
  return response.data.data
}

/** Fire after every wizard step so an abandoned/refreshed session resumes
 * from the server, not only from this tab's `localStorage`. */
export async function saveOnboardingDraft(
  patch: Partial<OnboardingData>,
): Promise<OnboardingStateResponse> {
  const response = await apiClient.patch<{ data: OnboardingStateResponse }>(
    endpoints.onboarding.saveDraft,
    sanitizeDraftPatch(patch),
  )
  return response.data.data
}

/** The wizard's final submission — marks `Profile.onboarding.completed` and
 * derives real `Profile.examGoals` entries server-side. */
export async function completeOnboarding(
  data: OnboardingData,
): Promise<OnboardingStateResponse> {
  const response = await apiClient.post<{ data: OnboardingStateResponse }>(
    endpoints.onboarding.complete,
    sanitizeDraftPatch(data),
  )
  return response.data.data
}
