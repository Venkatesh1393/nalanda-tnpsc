/**
 * Smart Practice DTOs (docs/Smart_Practice.md, docs/Database.md §4.3) — one
 * type per collection/screen concept, mirroring the `types/learn.ts`
 * convention. No backend exists yet (docs/MASTER_ROADMAP.md Phase 5), so
 * `PracticeQuestion.id` and `PracticeSession.id` are plain generated
 * strings rather than real ObjectIds.
 */

/** `hundred-questions` is the branded "100 Questions" mode
 * (docs/Smart_Practice.md §1) — its actual session length is capped to the
 * mock question bank's size, not literally 100 (see `services/practiceService.ts`). */
export type PracticeMode = 'quiz' | 'hundred-questions' | 'sectional' | 'mock' | 'pyq'

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

/** Topic Quiz and 100 Questions are adaptive (soft timer, immediate
 * per-question reveal); Sectional/Mock/PYQ are fixed exam simulations
 * (hard timer, reveal only in Review) — docs/Smart_Practice.md §2/§3/§11. */
export function isAdaptiveMode(mode: PracticeMode): boolean {
  return mode === 'quiz' || mode === 'hundred-questions'
}

export type PracticeQuestionOption = {
  id: string
  text: string
}

export type PracticeQuestion = {
  id: string
  questionText: string
  options: PracticeQuestionOption[]
  /** Undefined for a real-backend question before it's been answered — the
   * answer key is never sent to the client ahead of submission (Step 46's
   * explicit answer-leakage rule). Once answered, the reveal lives on the
   * matching `PracticeAnswer` (`correctOptionId`/`explanation` there), not
   * here — this field only stays populated end-to-end for the still-mocked
   * Sectional/Mock/PYQ/100 Questions modes, whose bank already embeds it. */
  correctOptionId?: string
  /** Framed with the user's own answer at render time (docs/Smart_Practice.md
   * §5) — this is just the underlying factual explanation text. Same
   * leakage rule as `correctOptionId` above. */
  explanation?: string
  /** A single line that narrows the answer space without revealing it
   * (docs/Smart_Practice.md §4). Undefined for real-backend questions — no
   * backend Hints module exists yet (Step 46 scope). */
  hint?: string
  difficulty: QuestionDifficulty
  subjectName: string
  topicName: string
  tags: string[]
  source?: 'ai_generated' | 'curated' | 'pyq'
  /** Only present for `source: 'pyq'` questions — shown as a visible
   * year/exam-edition tag (docs/Smart_Practice.md §7). */
  pyqYear?: number
  /** Real-backend questions only (`Question.aiExplanationEligible`) — combined
   * with the signed-in user's subscription tier to decide the AI Explanation
   * button's entitlement state (Step 46 §8). */
  hasAiExplanation?: boolean
}

export type PracticeAnswer = {
  questionId: string
  selectedOptionId: string | null
  markedForReview: boolean
  hintUsed: boolean
  /** Populated the moment this question is answered/revealed — real-backend
   * quiz sessions get these from `POST /practice/sessions/{id}/answers`'s
   * response; the still-mocked modes compute them locally from the mock
   * bank's own embedded `correctOptionId`/`explanation`. Consumers should
   * read `answer.correctOptionId ?? question.correctOptionId` (and the same
   * fallback for `explanation`) so both paths render identically. */
  isCorrect?: boolean
  correctOptionId?: string
  explanation?: string
}

export type TimerType = 'soft' | 'hard'

export type PracticeSessionStatus = 'in-progress' | 'submitted'

export type PracticeSession = {
  id: string
  mode: PracticeMode
  examCategory: string
  subjectName?: string
  topicName?: string
  pyqYear?: number
  timerType: TimerType
  /** Total time budget in seconds. Hard-timer modes auto-submit at zero;
   * soft-timer modes use this only as a reference the count-up timer runs
   * past freely, never a deadline (docs/Smart_Practice.md §2). */
  durationSeconds: number
  questionIds: string[]
  answers: Record<string, PracticeAnswer>
  startedAt: string
  status: PracticeSessionStatus
  submittedAt?: string
}

export type PracticeResult = {
  sessionId: string
  totalQuestions: number
  correctCount: number
  incorrectCount: number
  skippedCount: number
  accuracyPercent: number
  timeTakenSeconds: number
  xpAwarded: number
  coinsAwarded: number
  newlyUnlockedAchievementIds: PracticeAchievementId[]
  /** Real-backend quiz sessions only — the still-mocked modes' Summary
   * screen already gets these from `session.subjectName`/`topicName`
   * directly, so they stay undefined there rather than duplicated. */
  subjectName?: string
  topicName?: string
  /** Real-backend quiz sessions only — powers the Results page's average
   * response-time stat (Step 46 §11); the mocked modes don't track it. */
  averageResponseTimeSeconds?: number
}

export type PracticeHistoryItem = {
  sessionId: string
  subjectName: string
  topicName: string
  totalQuestions: number
  correctCount: number
  accuracyPercent: number
  submittedAt: string
}

export type PracticeHistoryPage = {
  items: PracticeHistoryItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

/** The original 5 Practice-specific badge definitions from
 * docs/Smart_Practice.md §15 — see `services/practiceSessionService.ts` for
 * each one's (necessarily mock-scope-simplified) unlock rule. Still used by
 * the still-mocked Sectional/Mock/PYQ/100-Questions modes only. */
export type MockOnlyAchievementId =
  | 'first-100-questions'
  | 'seven-day-streak'
  | 'first-mock-completed'
  | 'pyq-completionist'
  | 'comeback'

/** The real, backend-awarded 8-achievement catalog (Sprint 4 Step 61,
 * `backend/src/constants/badges.ts`'s `BadgeCode`) — powers the real Topic
 * Quiz completion path and the Dashboard Achievements grid. Note
 * `seven-day-streak` exists in both catalogs independently (same id, two
 * unrelated unlock rules — mock-local-storage-derived vs. real
 * `Profile.streak`-derived) since the two systems never share data. */
export type RealAchievementId =
  | 'first-practice'
  | 'hundred-questions'
  | 'five-hundred-questions'
  | 'thousand-questions'
  | 'seven-day-streak'
  | 'thirty-day-streak'
  | 'perfect-score'
  | 'fast-learner'

export type PracticeAchievementId = MockOnlyAchievementId | RealAchievementId
