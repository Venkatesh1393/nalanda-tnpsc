import type { ExamCategoryId } from '@/constants/exam'
import type {
  LearningStyle,
  OnboardingLanguage,
  StudyHoursBand,
} from '@/constants/onboarding'

/**
 * The canonical step order (docs/Onboarding.md's Flow Overview), plus this
 * session's two additions requested alongside it — Learning Style (between
 * Weak Subjects and Generate Plan) and a distinct Completion screen after
 * the plan is generated (docs/Onboarding.md itself fades straight into the
 * Dashboard; see `docs/PROJECT_CONTEXT.md` §14 for this deviation).
 */
export const ONBOARDING_STEPS = [
  'language',
  'exam',
  'target-month',
  'study-hours',
  'weak-subjects',
  'learning-style',
  'generate-plan',
  'completion',
] as const
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]

/** Steps a progress indicator/back-forward wizard actually applies to — the
 * last two are payoff/confirmation moments, not data-entry steps (see the
 * `OnboardingPage` header comment for why they're excluded from "Step N of
 * M"). */
export const ONBOARDING_INPUT_STEPS = ONBOARDING_STEPS.filter(
  (step) => step !== 'generate-plan' && step !== 'completion',
)

export type OnboardingData = {
  language: OnboardingLanguage | null
  examCategories: ExamCategoryId[]
  targetMonth: string | null
  studyHoursBand: StudyHoursBand | null
  weakSubjects: string[]
  learningStyle: LearningStyle | null
}

export const initialOnboardingData: OnboardingData = {
  language: null,
  examCategories: [],
  targetMonth: null,
  studyHoursBand: null,
  weakSubjects: [],
  learningStyle: null,
}

/** The real `GET /onboarding` / `PATCH /onboarding` / `POST
 * /onboarding/complete` response shape (Step 44 §B,
 * `backend/src/services/onboarding.service.ts`'s `OnboardingStateDTO`). */
export type OnboardingStateResponse = {
  language: OnboardingLanguage
  examCategories: ExamCategoryId[]
  targetMonth: string | null
  studyHoursBand: StudyHoursBand | null
  weakSubjects: string[]
  learningStyle: LearningStyle | null
  completed: boolean
  completedAt: string | null
}
