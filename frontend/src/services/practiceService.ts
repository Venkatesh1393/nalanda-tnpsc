import {
  getPyqYears as getPyqYearsMock,
  getQuestionBank as getQuestionBankMock,
  getQuestionById as getQuestionByIdMock,
  QUESTION_BANK,
} from '@/services/mock/questionsMockService'
import type { PracticeMode, PracticeQuestion } from '@/types/practice'

/**
 * The read-only half of the mocked Smart Practice engine
 * (docs/Smart_Practice.md) — no backend exists yet (Sprint 3). The raw
 * question bank itself lives in `services/mock/questionsMockService.ts`
 * (the Questions backend module, docs/API.md §5); this file adds Practice-
 * specific session-building logic on top of it, which isn't part of the
 * raw Questions API surface.
 *
 * `hundred-questions` ("100 Questions", docs/Smart_Practice.md §1) is the
 * one deliberate scope simplification here: rather than padding this bank
 * out to a literal 100 questions with repeats (which would read as
 * obviously fake), a "100 Questions" session simply uses every question in
 * the bank — the mode keeps its branded name, but the actual session length
 * (and the progress tracker's "Question X of N") is always the real count.
 */

export { QUESTION_BANK }

export async function getQuestionBank(): Promise<PracticeQuestion[]> {
  return getQuestionBankMock()
}

export function getQuestionById(questionId: string): PracticeQuestion | undefined {
  return getQuestionByIdMock(questionId)
}

export function getPyqYears(): number[] {
  return getPyqYearsMock()
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export type SessionQuestionFilter = {
  mode: PracticeMode
  subjectName?: string
  topicName?: string
  pyqYear?: number
}

/** Builds a session's question set from the mock bank. Never returns an
 * empty set — a filter combination with no matches falls back to the full
 * bank rather than starting an unusable empty session (docs/UserJourney.md
 * Screen 7's "inform the user... rather than starting a test with
 * insufficient content" is satisfied one level up, by the mode picker
 * disabling Start when a narrower, real check would be needed against a
 * real backend; this fallback is this mock's safety net). */
export function selectQuestionsForSession(
  filter: SessionQuestionFilter,
): PracticeQuestion[] {
  let pool = QUESTION_BANK

  if (filter.mode === 'pyq') {
    pool = pool.filter(
      (q) =>
        q.source === 'pyq' &&
        (filter.pyqYear === undefined || q.pyqYear === filter.pyqYear),
    )
  } else if (filter.subjectName) {
    pool = pool.filter((q) => q.subjectName === filter.subjectName)
    if (filter.topicName) {
      pool = pool.filter((q) => q.topicName === filter.topicName)
    }
  }

  if (pool.length === 0) pool = QUESTION_BANK
  return shuffle(pool)
}
