import { useEffect, useRef, useState } from 'react'

import {
  completeOnboarding as completeOnboardingApi,
  getOnboardingState,
  saveOnboardingDraft,
} from '@/services/onboardingService'
import {
  initialOnboardingData,
  ONBOARDING_STEPS,
  type OnboardingData,
} from '@/features/onboarding/types'

const PROGRESS_STORAGE_KEY = 'nalanda-onboarding-progress'
const COMPLETE_STORAGE_KEY = 'nalanda-onboarding-complete'

type StoredProgress = { stepIndex: number; data: OnboardingData }

function readStoredProgress(): StoredProgress | null {
  const raw = localStorage.getItem(PROGRESS_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredProgress
  } catch {
    return null
  }
}

/** Whether this device has already finished onboarding once — kept only as
 * a fast, optimistic local check now that `AuthUser.onboardingCompleted`
 * (real, backend-sourced) is the actual source of truth `OnboardingPage`
 * gates on; this still guards the brief window before that field has ever
 * been fetched. */
export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(COMPLETE_STORAGE_KEY) === 'true'
}

/**
 * Onboarding wizard state (Step 44 §B) — held client-side for instant,
 * per-keystroke UI updates, and now backed by the real
 * `GET/PATCH /onboarding` endpoints: on mount, the persisted server draft
 * (if any) is fetched and merged over whatever `localStorage`/initial state
 * already seeded the wizard with, and every `updateData` call fires a
 * best-effort save to the server in the background. `localStorage` remains
 * as a same-tab fast path (so navigating Back/Continue never waits on a
 * network round-trip) and as a fallback if the initial fetch fails (offline,
 * cold start) — but the server, not `localStorage`, is what actually
 * survives "refresh must not lose onboarding information" across devices
 * or a cleared browser.
 */
export function useOnboardingWizard() {
  const [stepIndex, setStepIndex] = useState(() => {
    const stored = readStoredProgress()
    return stored ? Math.min(stored.stepIndex, ONBOARDING_STEPS.length - 1) : 0
  })
  const [data, setData] = useState<OnboardingData>(
    () => readStoredProgress()?.data ?? initialOnboardingData,
  )
  const [isLoading, setIsLoading] = useState(true)
  const hasFetchedDraft = useRef(false)

  useEffect(() => {
    if (hasFetchedDraft.current) return
    hasFetchedDraft.current = true

    getOnboardingState()
      .then((state) => {
        setData((previous) => ({
          language: state.language ?? previous.language,
          examCategories:
            state.examCategories.length > 0
              ? state.examCategories
              : previous.examCategories,
          targetMonth: state.targetMonth ?? previous.targetMonth,
          studyHoursBand: state.studyHoursBand ?? previous.studyHoursBand,
          weakSubjects:
            state.weakSubjects.length > 0 ? state.weakSubjects : previous.weakSubjects,
          learningStyle: state.learningStyle ?? previous.learningStyle,
        }))
      })
      .catch(() => {
        // No draft saved yet, or a transient network error — the state
        // already seeded from localStorage/initialOnboardingData above is a
        // perfectly fine starting point either way.
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ stepIndex, data } satisfies StoredProgress),
    )
  }, [stepIndex, data])

  function updateData(patch: Partial<OnboardingData>) {
    setData((previous) => ({ ...previous, ...patch }))
    void saveOnboardingDraft(patch).catch(() => {
      // Best-effort — localStorage already has this tab's latest state, and
      // the final `finish()` submission below sends the complete payload
      // regardless, so a single dropped intermediate save is self-healing.
    })
  }

  function goNext() {
    setStepIndex((index) => Math.min(index + 1, ONBOARDING_STEPS.length - 1))
  }

  function goBack() {
    setStepIndex((index) => Math.max(index - 1, 0))
  }

  /** Called once the Completion step's "Go to Dashboard" is pressed —
   * submits the full wizard payload to `POST /onboarding/complete` (which
   * also derives real `Profile.examGoals`), then clears the in-progress
   * wizard state and marks onboarding done for next time. Throws on
   * failure so `OnboardingPage` can keep the user on this screen and show
   * an error instead of navigating to a Dashboard backed by an incomplete
   * Profile. */
  async function finish(): Promise<void> {
    await completeOnboardingApi(data)
    localStorage.removeItem(PROGRESS_STORAGE_KEY)
    localStorage.setItem(COMPLETE_STORAGE_KEY, 'true')
  }

  return {
    step: ONBOARDING_STEPS[stepIndex],
    stepIndex,
    totalSteps: ONBOARDING_STEPS.length,
    data,
    isLoading,
    updateData,
    goNext,
    goBack,
    finish,
  }
}
