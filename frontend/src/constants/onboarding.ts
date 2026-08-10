import type { ExamCategoryId } from '@/constants/exam'

/**
 * Reference/config data for the Onboarding wizard (docs/Onboarding.md,
 * docs/Onboarding_Personalization_Flow.md) — static option catalogs, the
 * same category as `constants/exam.ts`'s `EXAM_CATEGORIES`, not user data.
 */

export const ONBOARDING_LANGUAGES = [
  { id: 'ta', label: 'தமிழ்' },
  { id: 'en', label: 'English' },
  { id: 'bilingual', label: 'Both / Bilingual' },
] as const
export type OnboardingLanguage = (typeof ONBOARDING_LANGUAGES)[number]['id']

export const STUDY_HOURS_BANDS = [
  { id: 'under-1', label: 'Less than 1 hour' },
  { id: '1-2', label: '1–2 hours' },
  { id: '2-4', label: '2–4 hours' },
  { id: '4-plus', label: '4+ hours' },
] as const
export type StudyHoursBand = (typeof STUDY_HOURS_BANDS)[number]['id']

/**
 * Not in `docs/Onboarding.md` — this session's addition (see
 * `docs/PROJECT_CONTEXT.md` §14) to match the 8-step flow requested,
 * modeled on the persona research in `docs/UserPersonas.md` (Priya: visual/
 * video-first; Karthik/Divya: dense bullet notes; Smart_Practice.md's
 * practice-led personas).
 */
export const LEARNING_STYLES = [
  {
    id: 'video',
    title: 'Video lessons',
    description: 'Short videos before anything else.',
  },
  {
    id: 'notes',
    title: 'Reading & notes',
    description: 'Dense notes and one-liners.',
  },
  {
    id: 'practice',
    title: 'Practice-first',
    description: 'Learn by attempting questions.',
  },
  {
    id: 'mixed',
    title: 'A mix of everything',
    description: 'No strong preference either way.',
  },
] as const
export type LearningStyle = (typeof LEARNING_STYLES)[number]['id']

/** Sentinel value for docs/Onboarding.md Screen 3's "I'm not sure yet"
 * option — a first-class choice, not the absence of one. */
export const NOT_SURE_TARGET_MONTH = 'not-sure' as const

export type TargetMonthOption = { id: string; label: string }

/**
 * The next `count` months as selectable chips (docs/Onboarding.md Screen 3
 * — "a row of selectable month chips covering roughly the next 12 months").
 * `id` is a stable `YYYY-MM` key; only future months are ever generated, so
 * there's no invalid past-month state to reject.
 */
export function getUpcomingMonths(
  count = 12,
  from = new Date(),
  language: 'en' | 'ta' = 'en',
): TargetMonthOption[] {
  const locale = language === 'ta' ? 'ta-IN' : 'en-IN'
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(from.getFullYear(), from.getMonth() + index, 1)
    return {
      id: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    }
  })
}

const GENERAL_SUBJECTS = [
  'Tamil',
  'General English',
  'General Science',
  'General Studies',
  'Aptitude & Mental Ability',
  'Current Affairs',
]

/** TRB is a distinct, teaching-focused exam — its subject list doesn't
 * overlap with the general TNPSC subjects above. */
const TRB_SUBJECTS = [
  'Education & Psychology',
  'Subject Pedagogy',
  'General Studies',
  'Current Affairs',
]

/**
 * The weak-subjects candidate list for docs/Onboarding.md Screen 5, scoped
 * to whichever exam(s) the user picked in Screen 2 — the union of each
 * selected exam's subjects, deduplicated, so a Group 4 + Police aspirant
 * doesn't see subjects irrelevant to either.
 */
export function getSubjectsForExams(examCategories: ExamCategoryId[]): string[] {
  const subjects = new Set<string>()
  for (const examId of examCategories) {
    const list = examId === 'trb' ? TRB_SUBJECTS : GENERAL_SUBJECTS
    for (const subject of list) subjects.add(subject)
  }
  return Array.from(subjects)
}
