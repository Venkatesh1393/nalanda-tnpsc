/**
 * Practice-engine enums. Kept identical to the already-built
 * `frontend/src/types/practice.ts` (kebab-case `PracticeMode`,
 * `QuestionDifficulty`, `source`) rather than `docs/API.md`'s illustrative
 * snake_case (`topic_quiz`) — matching the real, shipped frontend contract
 * takes priority over the older doc example now that one exists.
 */
export const PRACTICE_MODES = [
  'quiz',
  'hundred-questions',
  'sectional',
  'mock',
  'pyq',
] as const
export type PracticeMode = (typeof PRACTICE_MODES)[number]

export const QUESTION_DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number]

/** Practice-configuration-only — `Question.difficulty` itself is never
 * `'all'`; this is the superset a session-creation request may pick from. */
export const PRACTICE_DIFFICULTY_FILTERS = ['all', ...QUESTION_DIFFICULTIES] as const
export type PracticeDifficultyFilter = (typeof PRACTICE_DIFFICULTY_FILTERS)[number]

export const QUESTION_SOURCES = ['pyq', 'ai_generated', 'curated'] as const
export type QuestionSource = (typeof QUESTION_SOURCES)[number]

/**
 * Not yet in any doc — added so `Question.questionType` can express formats
 * beyond a single-correct MCQ later without a schema migration. Only
 * `mcq_single` has real UI/validation support today (see
 * `Question.model.ts`'s "exactly one correct option" rule).
 */
export const QUESTION_TYPES = [
  'mcq_single',
  'mcq_multiple',
  'assertion_reason',
  'match_following',
  'true_false',
] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

/** The exam *stage* a PYQ question was originally asked in — distinct from
 * `Question.examIds` (which exams this question is usable for in practice). */
export const TNPSC_EXAM_STAGES = ['prelims', 'mains', 'interview'] as const
export type TnpscExamStage = (typeof TNPSC_EXAM_STAGES)[number]

export const TIMER_TYPES = ['soft', 'hard'] as const
export type TimerType = (typeof TIMER_TYPES)[number]

export const PRACTICE_SESSION_STATUSES = ['in-progress', 'submitted'] as const
export type PracticeSessionStatus = (typeof PRACTICE_SESSION_STATUSES)[number]

/** Display labels for each mode — kept identical to the frontend's own
 * `features/practice/lib/mode-meta.ts` titles, so Analytics' Practice
 * History chart reads the same mode names a student already sees on the
 * Practice/Summary screens. */
export const PRACTICE_MODE_LABELS: Record<PracticeMode, string> = {
  quiz: 'Topic Quiz',
  'hundred-questions': '100 Questions',
  sectional: 'Sectional Test',
  mock: 'Mock Test',
  pyq: 'Previous Year Questions',
}
