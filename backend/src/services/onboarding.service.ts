import type { LanguagePreference, StudyHoursBand } from '../constants/user'
import type { ExamCategoryCode } from '../constants/exam'
import type { LearningStyle } from '../constants/onboarding'
import { NOT_SURE_TARGET_MONTH } from '../constants/onboarding'
import type { IExamGoal, ProfileDocument } from '../models/Profile.model'
import type { UserDocument } from '../models/User.model'
import * as examRepository from '../repositories/exam.repository'
import * as profileRepository from '../repositories/profile.repository'
import * as userRepository from '../repositories/user.repository'
import { ApiError } from '../utils/ApiError'
import type {
  OnboardingCompleteBody,
  OnboardingDraftBody,
} from '../validators/onboarding.validator'

export interface OnboardingStateDTO {
  language: LanguagePreference
  examCategories: ExamCategoryCode[]
  targetMonth: string | null
  studyHoursBand: StudyHoursBand | null
  weakSubjects: string[]
  learningStyle: LearningStyle | null
  completed: boolean
  completedAt: Date | null
}

function toDTO(user: UserDocument, profile: ProfileDocument): OnboardingStateDTO {
  return {
    language: user.languagePreference,
    examCategories: profile.onboarding.examCategories,
    targetMonth: profile.onboarding.targetMonth ?? null,
    studyHoursBand: profile.onboarding.studyHoursBand ?? null,
    weakSubjects: profile.onboarding.weakSubjects,
    learningStyle: profile.onboarding.learningStyle ?? null,
    completed: profile.onboarding.completed,
    completedAt: profile.onboarding.completedAt ?? null,
  }
}

async function loadState(
  userId: string,
): Promise<{ user: UserDocument; profile: ProfileDocument }> {
  const [user, profile] = await Promise.all([
    userRepository.findById(userId),
    profileRepository.findByUserId(userId),
  ])
  if (!user) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.')
  }
  if (!profile) {
    throw ApiError.internal('Profile record is missing for this account.')
  }
  return { user, profile }
}

export async function getState(userId: string): Promise<OnboardingStateDTO> {
  const { user, profile } = await loadState(userId)
  return toDTO(user, profile)
}

/** Partial save after any wizard step (Step 44 §B) — never marks the
 * onboarding flow complete, only persists whatever's been answered so far
 * so a refresh mid-wizard resumes from the server, not `localStorage`.
 * `language` updates `User.languagePreference` directly (it's an identity
 * setting read on every request, not wizard-specific state); everything
 * else is a partial `$set` onto `Profile.onboarding`. */
export async function saveDraft(
  userId: string,
  patch: OnboardingDraftBody,
): Promise<OnboardingStateDTO> {
  const { language, ...profilePatch } = patch

  await Promise.all([
    language !== undefined
      ? userRepository.updateLanguagePreference(userId, language)
      : null,
    Object.keys(profilePatch).length > 0
      ? profileRepository.saveOnboardingDraft(userId, {
          examCategories: profilePatch.examCategories,
          targetMonth: profilePatch.targetMonth ?? undefined,
          studyHoursBand: profilePatch.studyHoursBand ?? undefined,
          weakSubjects: profilePatch.weakSubjects,
          learningStyle: profilePatch.learningStyle ?? undefined,
        })
      : null,
  ])

  return getState(userId)
}

/** `YYYY-MM` → the first of that month, UTC — `targetMonth` is validated by
 * `onboardingCompleteSchema` before this ever runs, so the split is safe. */
function parseTargetMonth(value: string): Date {
  const [yearStr, monthStr] = value.split('-')
  return new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1))
}

/**
 * The wizard's final submission (Step 44 §B "Flow": choose exam → save
 * selections → dashboard). Beyond persisting the raw wizard answers onto
 * `Profile.onboarding`, this also derives real `Profile.examGoals` entries
 * (resolving each selected exam category to its `Exam` document) so
 * Study Plans/Dashboard have a proper exam reference to build on later —
 * the first selected exam becomes the primary goal.
 */
export async function complete(
  userId: string,
  data: OnboardingCompleteBody,
): Promise<OnboardingStateDTO> {
  const {
    language,
    examCategories,
    targetMonth,
    studyHoursBand,
    weakSubjects,
    learningStyle,
  } = data

  const exams = await examRepository.findByCodes(examCategories)
  if (exams.length === 0) {
    throw ApiError.badRequest('None of the selected exam categories were recognized.')
  }
  const examByCode = new Map(exams.map((exam) => [exam.code, exam]))

  const targetDate =
    targetMonth && targetMonth !== NOT_SURE_TARGET_MONTH
      ? parseTargetMonth(targetMonth)
      : undefined

  const examGoals: IExamGoal[] = examCategories
    .map((code) => examByCode.get(code))
    .filter((exam): exam is NonNullable<typeof exam> => Boolean(exam))
    .map((exam, index) => ({
      examId: exam._id,
      targetDate,
      dailyStudyHoursBand: studyHoursBand,
      isPrimary: index === 0,
    }))

  await Promise.all([
    userRepository.updateLanguagePreference(userId, language),
    profileRepository.completeOnboarding(
      userId,
      {
        examCategories,
        targetMonth: targetMonth ?? undefined,
        studyHoursBand,
        weakSubjects,
        learningStyle: learningStyle ?? undefined,
      },
      examGoals,
    ),
  ])

  return getState(userId)
}
