import type { OnboardingData, OnboardingStepId } from '@/features/onboarding/types'

/**
 * Per-step validity (docs/Onboarding_Personalization_Flow.md §9's
 * Validation Summary) — every step here is a selection, not free text, so
 * validation is a presence/length check rather than a Zod schema. Drives
 * whether `OnboardingPage` enables that step's Continue button.
 */
export function isStepComplete(step: OnboardingStepId, data: OnboardingData): boolean {
  switch (step) {
    case 'language':
      return data.language !== null
    case 'exam':
      return data.examCategories.length > 0
    case 'target-month':
      return data.targetMonth !== null
    case 'study-hours':
      return data.studyHoursBand !== null
    case 'weak-subjects':
      // Zero selections is a deliberately valid outcome (docs/Onboarding.md
      // Screen 5 — a user genuinely unsure of their weak areas shouldn't be
      // blocked from continuing).
      return true
    case 'learning-style':
      return data.learningStyle !== null
    case 'generate-plan':
    case 'completion':
      return true
  }
}
