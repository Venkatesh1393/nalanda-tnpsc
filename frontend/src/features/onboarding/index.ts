/**
 * The Onboarding feature's public surface — pages import from here, never
 * by reaching into `features/onboarding/components/*` directly (per
 * `features/README.md`).
 */
export { CompletionStep } from '@/features/onboarding/components/completion-step'
export { ExamStep } from '@/features/onboarding/components/exam-step'
export { GeneratePlanStep } from '@/features/onboarding/components/generate-plan-step'
export { LanguageStep } from '@/features/onboarding/components/language-step'
export { LearningStyleStep } from '@/features/onboarding/components/learning-style-step'
export { StepProgress } from '@/features/onboarding/components/step-progress'
export { StudyHoursStep } from '@/features/onboarding/components/study-hours-step'
export { TargetMonthStep } from '@/features/onboarding/components/target-month-step'
export { WeakSubjectsStep } from '@/features/onboarding/components/weak-subjects-step'
export {
  hasCompletedOnboarding,
  useOnboardingWizard,
} from '@/features/onboarding/hooks/use-onboarding-wizard'
export { isStepComplete } from '@/features/onboarding/lib/validation'
export {
  ONBOARDING_INPUT_STEPS,
  type OnboardingStepId,
} from '@/features/onboarding/types'
