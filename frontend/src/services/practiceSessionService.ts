import axios from 'axios'

import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import { primeQuestionBookmarkState } from '@/services/learnProgressService'
import { getQuestionById, selectQuestionsForSession } from '@/services/practiceService'
import type { AchievementItem } from '@/types/dashboard'
import type {
  MockOnlyAchievementId,
  PracticeAchievementId,
  PracticeAnswer,
  PracticeHistoryPage,
  PracticeMode,
  PracticeQuestion,
  PracticeQuestionOption,
  PracticeResult,
  PracticeSession,
  QuestionDifficulty,
  TimerType,
} from '@/types/practice'

/**
 * The stateful half of the Smart Practice engine. As of Step 46, Topic Quiz
 * (`mode: 'quiz'`) is real — backed by MongoDB via `backend/src/routes/practice.routes.ts`
 * — while 100 Questions/Sectional/Mock/PYQ stay on the original `localStorage`-backed
 * mock (no backend module exists for those modes yet, out of this step's
 * scope). Every exported function keeps one stable signature and internally
 * routes to the real API or the mock implementation — callers (pages/
 * components) never need to know which one they got.
 *
 * The two paths are told apart by `sessionId`/`questionId` shape: a real
 * backend id is always a 24-character hex Mongo ObjectId; every mock id
 * (`generateId('session')`, the mock question bank's `q-...` ids) is a
 * different, human-readable format that can never collide with that.
 */

const SESSIONS_KEY = 'nalanda-practice-sessions'
const RESULTS_KEY = 'nalanda-practice-results'
const PROGRESS_KEY = 'nalanda-practice-progress'

const DAILY_FREE_HINT_LIMIT = 5

// docs/Smart_Practice.md §13-§14 — small, published, honestly-earned amounts.
// Real-backend sessions don't award XP/Coins yet (no gamification module
// exists server-side, Step 46 scope) — their result always reports 0,
// never a fabricated number.
const XP_PER_QUESTION_ANSWERED = 2
const XP_BONUS_PER_CORRECT = 3
const XP_SESSION_COMPLETION_BONUS = 20
const COINS_PER_CORRECT = 1
const COINS_SESSION_COMPLETION_BONUS = 5

export type PracticeErrorCode = 'SESSION_NOT_FOUND' | 'DAILY_HINT_LIMIT_REACHED'

export class PracticeMockError extends Error {
  code: PracticeErrorCode
  constructor(code: PracticeErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** A real backend id is always a 24-character hex Mongo ObjectId. Exported
 * (Sprint 4 Step 57) so callers outside this file — the AI Explanation
 * panel — can tell whether a session/question is backed by the real
 * database (and can therefore ask the real `/ai/explain` endpoint) or is
 * still a mock-mode session with no backend counterpart. */
export function isRealId(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id)
}

type StoredSessions = Record<string, PracticeSession>
type StoredResults = Record<string, PracticeResult>
type PracticeProgress = {
  xp: number
  coins: number
  unlockedAchievementIds: PracticeAchievementId[]
  /** Unique `YYYY-MM-DD` calendar days with at least one submitted session
   * — powers the 7-Day Streak and Comeback achievements. */
  completedSessionDates: string[]
  hintsUsedToday: { date: string; count: number }
}

function emptyProgress(): PracticeProgress {
  return {
    xp: 0,
    coins: 0,
    unlockedAchievementIds: [],
    completedSessionDates: [],
    hintsUsedToday: { date: todayKey(), count: 0 },
  }
}

function readSessions(): StoredSessions {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '{}') as StoredSessions
  } catch {
    return {}
  }
}
function writeSessions(sessions: StoredSessions): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

function readResults(): StoredResults {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY) ?? '{}') as StoredResults
  } catch {
    return {}
  }
}
function writeResults(results: StoredResults): void {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results))
}

function readProgress(): PracticeProgress {
  const raw = localStorage.getItem(PROGRESS_KEY)
  if (!raw) return emptyProgress()
  try {
    return { ...emptyProgress(), ...(JSON.parse(raw) as Partial<PracticeProgress>) }
  } catch {
    return emptyProgress()
  }
}
function writeProgress(progress: PracticeProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

const TIMER_TYPE_BY_MODE: Record<PracticeMode, TimerType> = {
  quiz: 'soft',
  'hundred-questions': 'soft',
  sectional: 'hard',
  mock: 'hard',
  pyq: 'hard',
}

// Per-question time budgets (docs/Smart_Practice.md §2) — soft-timer values
// are only a pacing reference (the timer counts up past them freely); hard-
// timer values are the real, enforced countdown. Mock-mode use only; the
// real backend computes its own `durationSeconds` (~90s/question).
const SECONDS_PER_QUESTION_BY_MODE: Record<PracticeMode, number> = {
  quiz: 45,
  'hundred-questions': 40,
  sectional: 60,
  mock: 75,
  pyq: 60,
}

export function getTimerTypeForMode(mode: PracticeMode): TimerType {
  return TIMER_TYPE_BY_MODE[mode]
}

// ---- Real-backend response shapes (backend/src/services/practice.service.ts DTOs) ----

type BackendOptionDTO = { id: string; text: string }
type BackendQuestionDTO = {
  id: string
  questionText: string
  questionImageUrl: string | null
  options: BackendOptionDTO[]
  difficulty: QuestionDifficulty
  hasAiExplanation: boolean
}
type BackendSessionDTO = {
  id: string
  mode: PracticeMode
  examId: string | null
  subjectId: string
  subjectName: string
  topicId: string
  topicName: string
  timerType: TimerType
  durationSeconds: number
  status: 'in-progress' | 'submitted'
  startedAt: string
  questions: BackendQuestionDTO[]
  answers: {
    questionId: string
    selectedOptionId: string | null
    markedForReview: boolean
  }[]
}
type BackendAnswerFeedbackDTO = {
  isCorrect: boolean
  correctOptionId: string
  standardExplanation: string
}
type BackendAchievementDTO = {
  code: string
  title: string
  description: string
  earned: boolean
  earnedAt: string | null
}
type BackendFinishResultDTO = {
  sessionId: string
  totalQuestions: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  score: number
  accuracyPercent: number
  timeTakenSeconds: number
  averageResponseTimeSeconds: number
  subjectName: string
  topicName: string
  /** Real as of Sprint 4 Step 61 (Gamification System) — awarded exactly
   * once, on genuine first submission. */
  xpAwarded: number
  coinsAwarded: number
  newlyUnlockedAchievements: BackendAchievementDTO[]
}
type BackendReviewQuestionDTO = {
  questionId: string
  questionText: string
  options: BackendOptionDTO[]
  selectedOptionId: string | null
  correctOptionId: string
  isCorrect: boolean
  standardExplanation: string
  isBookmarked: boolean
  aiExplanation: { eligible: boolean; entitled: boolean }
}
type BackendReviewDTO = {
  sessionId: string
  subjectName: string
  topicName: string
  questions: BackendReviewQuestionDTO[]
}
type BackendHistoryItemDTO = {
  sessionId: string
  subjectName: string
  topicName: string
  totalQuestions: number
  correctCount: number
  accuracyPercent: number
  submittedAt: string
}

/** Populated by `getSession`/`createSession` (real path) and `getReview`
 * — `getSessionQuestions` reads from here for a real session id, since
 * unlike the mock bank these questions aren't in any static, always-
 * importable module. Module-level (not persisted): a page refresh simply
 * re-fetches the session/review first, repopulating this before
 * `getSessionQuestions` is ever called downstream in the same render pass. */
const realSessionQuestionsCache = new Map<string, PracticeQuestion[]>()

function toFrontendOptions(options: BackendOptionDTO[]): PracticeQuestionOption[] {
  return options.map((option) => ({ id: option.id, text: option.text }))
}

function toFrontendSession(dto: BackendSessionDTO): PracticeSession {
  const questions: PracticeQuestion[] = dto.questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    options: toFrontendOptions(q.options),
    difficulty: q.difficulty,
    subjectName: dto.subjectName,
    topicName: dto.topicName,
    tags: [],
    hasAiExplanation: q.hasAiExplanation,
  }))
  realSessionQuestionsCache.set(dto.id, questions)

  const answers: Record<string, PracticeAnswer> = {}
  for (const a of dto.answers) {
    answers[a.questionId] = {
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
      markedForReview: a.markedForReview,
      hintUsed: false,
    }
  }

  return {
    id: dto.id,
    mode: dto.mode,
    examCategory: dto.examId ?? '',
    subjectName: dto.subjectName,
    topicName: dto.topicName,
    timerType: dto.timerType,
    durationSeconds: dto.durationSeconds,
    questionIds: dto.questions.map((q) => q.id),
    answers,
    startedAt: dto.startedAt,
    status: dto.status,
  }
}

function toFrontendResult(dto: BackendFinishResultDTO): PracticeResult {
  return {
    sessionId: dto.sessionId,
    totalQuestions: dto.totalQuestions,
    correctCount: dto.correctCount,
    incorrectCount: dto.incorrectCount,
    skippedCount: dto.unansweredCount,
    accuracyPercent: dto.accuracyPercent,
    timeTakenSeconds: dto.timeTakenSeconds,
    xpAwarded: dto.xpAwarded,
    coinsAwarded: dto.coinsAwarded,
    newlyUnlockedAchievementIds: dto.newlyUnlockedAchievements.map(
      (badge) => badge.code as PracticeAchievementId,
    ),
    subjectName: dto.subjectName,
    topicName: dto.topicName,
    averageResponseTimeSeconds: dto.averageResponseTimeSeconds,
  }
}

function notFoundToNull<T>(error: unknown): T | null {
  if (axios.isAxiosError(error) && error.response?.status === 404) return null
  throw error
}

// ---- Sessions ----

export type CreateSessionInput = {
  mode: PracticeMode
  examCategory: string
  /** Mock-mode path (Sectional/Mock/PYQ/100 Questions) — display names
   * filtered against the mock question bank. */
  subjectName?: string
  topicName?: string
  pyqYear?: number
  /** Real-backend path (Topic Quiz only) — real `Subject`/`Topic` slugs
   * (same ones `services/learnService.ts` already returns as `.id`) plus
   * the practice configuration Step 46 §4 requires. */
  subjectId?: string
  topicId?: string
  questionCount?: number
  difficulty?: 'all' | QuestionDifficulty
}

async function createRealSession(input: CreateSessionInput): Promise<PracticeSession> {
  const response = await apiClient.post<{ data: BackendSessionDTO }>(
    endpoints.practice.createSession,
    {
      examCategory: input.examCategory,
      subjectId: input.subjectId,
      topicId: input.topicId,
      questionCount: input.questionCount ?? 10,
      difficulty: input.difficulty ?? 'all',
    },
  )
  return toFrontendSession(response.data.data)
}

async function createMockSession(input: CreateSessionInput): Promise<PracticeSession> {
  const questions = selectQuestionsForSession({
    mode: input.mode,
    subjectName: input.subjectName,
    topicName: input.topicName,
    pyqYear: input.pyqYear,
  })

  const session: PracticeSession = {
    id: generateId('session'),
    mode: input.mode,
    examCategory: input.examCategory,
    subjectName: input.subjectName,
    topicName: input.topicName,
    pyqYear: input.pyqYear,
    timerType: TIMER_TYPE_BY_MODE[input.mode],
    durationSeconds: questions.length * SECONDS_PER_QUESTION_BY_MODE[input.mode],
    questionIds: questions.map((q) => q.id),
    answers: {},
    startedAt: new Date().toISOString(),
    status: 'in-progress',
  }

  const sessions = readSessions()
  sessions[session.id] = session
  writeSessions(sessions)
  return delay(session, 500)
}

export async function createSession(input: CreateSessionInput): Promise<PracticeSession> {
  if (input.mode === 'quiz') return createRealSession(input)
  return createMockSession(input)
}

export async function getSession(sessionId: string): Promise<PracticeSession | null> {
  if (isRealId(sessionId)) {
    try {
      const response = await apiClient.get<{ data: BackendSessionDTO }>(
        endpoints.practice.session(sessionId),
      )
      return toFrontendSession(response.data.data)
    } catch (error) {
      return notFoundToNull(error)
    }
  }
  return delay(readSessions()[sessionId] ?? null, 300)
}

export function getSessionQuestions(session: PracticeSession): PracticeQuestion[] {
  if (isRealId(session.id)) {
    return realSessionQuestionsCache.get(session.id) ?? []
  }
  return session.questionIds
    .map((id) => getQuestionById(id))
    .filter((q): q is PracticeQuestion => q !== undefined)
}

/** Only meaningful for a real session — returns the immediate correctness
 * reveal for one answer. `undefined` for a mock session (the mock's
 * `PracticeQuestion` already embeds `correctOptionId`/`explanation`
 * directly, so callers fall back to reading those instead). */
export async function saveAnswer(
  sessionId: string,
  questionId: string,
  patch: Partial<
    Pick<PracticeAnswer, 'selectedOptionId' | 'markedForReview' | 'hintUsed'>
  >,
  responseTimeSeconds = 0,
): Promise<BackendAnswerFeedbackDTO | undefined> {
  if (isRealId(sessionId)) {
    // The real backend only has one write path (`POST .../answers`, an
    // actual answer selection) — "mark for review" has no backend endpoint
    // (out of Step 46 scope) and stays a client-only UI toggle for quiz
    // sessions, same as it always was for a still-in-progress mock session.
    if (!patch.selectedOptionId) return undefined
    const response = await apiClient.post<{ data: BackendAnswerFeedbackDTO }>(
      endpoints.practice.answer(sessionId),
      {
        questionId,
        selectedOptionId: patch.selectedOptionId,
        responseTime: responseTimeSeconds,
      },
    )
    return response.data.data
  }

  const sessions = readSessions()
  const session = sessions[sessionId]
  if (!session || session.status === 'submitted') return undefined

  const existing: PracticeAnswer = session.answers[questionId] ?? {
    questionId,
    selectedOptionId: null,
    markedForReview: false,
    hintUsed: false,
  }
  session.answers[questionId] = { ...existing, ...patch }
  writeSessions(sessions)
  await delay(undefined, 150)
  return undefined
}

// ---- Hints — mock-mode only, no backend Hints module exists yet ----

export function getHintsRemainingToday(): number {
  const progress = readProgress()
  const used =
    progress.hintsUsedToday.date === todayKey() ? progress.hintsUsedToday.count : 0
  return Math.max(0, DAILY_FREE_HINT_LIMIT - used)
}

export async function consumeHint(
  sessionId: string,
  questionId: string,
): Promise<{ hintText: string; hintsRemainingToday: number }> {
  const progress = readProgress()
  const today = todayKey()
  if (progress.hintsUsedToday.date !== today) {
    progress.hintsUsedToday = { date: today, count: 0 }
  }
  if (progress.hintsUsedToday.count >= DAILY_FREE_HINT_LIMIT) {
    throw new PracticeMockError(
      'DAILY_HINT_LIMIT_REACHED',
      "You've used today's free hints — upgrade to Plus for unlimited hints.",
    )
  }

  progress.hintsUsedToday.count += 1
  writeProgress(progress)
  await saveAnswer(sessionId, questionId, { hintUsed: true })

  const question = getQuestionById(questionId)
  await delay(undefined, 300)
  return {
    hintText: question?.hint ?? 'No hint available for this question.',
    hintsRemainingToday: DAILY_FREE_HINT_LIMIT - progress.hintsUsedToday.count,
  }
}

// ---- Submit & Results ----

function hasConsecutiveDayStreak(sortedUniqueDates: string[], length: number): boolean {
  if (sortedUniqueDates.length < length) return false
  const window = sortedUniqueDates.slice(-length)
  for (let i = 1; i < window.length; i++) {
    const diffDays = Math.round(
      (new Date(window[i]).getTime() - new Date(window[i - 1]).getTime()) / 86_400_000,
    )
    if (diffDays !== 1) return false
  }
  return true
}

async function finishRealSession(sessionId: string): Promise<PracticeResult> {
  const response = await apiClient.post<{ data: BackendFinishResultDTO }>(
    endpoints.practice.finish(sessionId),
  )
  return toFrontendResult(response.data.data)
}

async function finishMockSession(sessionId: string): Promise<PracticeResult> {
  const existingResult = readResults()[sessionId]
  if (existingResult) return delay(existingResult, 200) // idempotent, per docs/API.md §6

  const sessions = readSessions()
  const session = sessions[sessionId]
  if (!session) {
    throw new PracticeMockError(
      'SESSION_NOT_FOUND',
      'This practice session could not be found.',
    )
  }

  const questions = getSessionQuestions(session)
  let correctCount = 0
  let incorrectCount = 0
  let skippedCount = 0
  for (const question of questions) {
    const answer = session.answers[question.id]
    if (!answer || answer.selectedOptionId === null) {
      skippedCount += 1
    } else if (answer.selectedOptionId === question.correctOptionId) {
      correctCount += 1
    } else {
      incorrectCount += 1
    }
  }

  const totalQuestions = questions.length
  const answeredCount = correctCount + incorrectCount
  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  const timeTakenSeconds = Math.max(
    0,
    Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000),
  )
  const xpAwarded =
    answeredCount * XP_PER_QUESTION_ANSWERED +
    correctCount * XP_BONUS_PER_CORRECT +
    XP_SESSION_COMPLETION_BONUS
  const coinsAwarded = correctCount * COINS_PER_CORRECT + COINS_SESSION_COMPLETION_BONUS

  session.status = 'submitted'
  session.submittedAt = new Date().toISOString()
  sessions[sessionId] = session
  writeSessions(sessions)

  const progress = readProgress()
  progress.xp += xpAwarded
  progress.coins += coinsAwarded

  const today = todayKey()
  const priorCompletionDates = [...progress.completedSessionDates].sort()
  if (!progress.completedSessionDates.includes(today)) {
    progress.completedSessionDates.push(today)
  }
  progress.completedSessionDates.sort()

  const newlyUnlocked: PracticeAchievementId[] = []
  function unlock(id: PracticeAchievementId) {
    if (!progress.unlockedAchievementIds.includes(id)) {
      progress.unlockedAchievementIds.push(id)
      newlyUnlocked.push(id)
    }
  }

  // Mock-scope-simplified unlock rules (docs/Smart_Practice.md §15) — a real
  // backend would check `Question Attempts`/`Achievements` directly; here
  // it's derived from this device's locally stored sessions/progress.
  const priorSubmittedSessions = Object.values(sessions).filter(
    (s) => s.status === 'submitted' && s.id !== sessionId,
  )
  if (
    session.mode === 'hundred-questions' &&
    !priorSubmittedSessions.some((s) => s.mode === 'hundred-questions')
  ) {
    unlock('first-100-questions')
  }
  if (session.mode === 'mock' && !priorSubmittedSessions.some((s) => s.mode === 'mock')) {
    unlock('first-mock-completed')
  }
  if (session.mode === 'pyq') {
    // Simplified from "a full year solved" (docs/Smart_Practice.md §15) to
    // "completed one PYQ session" — the mock bank doesn't have enough
    // PYQ-tagged questions per year to meaningfully gate on a full year.
    unlock('pyq-completionist')
  }
  if (hasConsecutiveDayStreak(progress.completedSessionDates, 7)) {
    unlock('seven-day-streak')
  }
  if (priorCompletionDates.length > 0) {
    const mostRecentPrior = priorCompletionDates[priorCompletionDates.length - 1]
    const gapDays = Math.round(
      (new Date(today).getTime() - new Date(mostRecentPrior).getTime()) / 86_400_000,
    )
    if (gapDays >= 3) unlock('comeback')
  }

  writeProgress(progress)

  const result: PracticeResult = {
    sessionId,
    totalQuestions,
    correctCount,
    incorrectCount,
    skippedCount,
    accuracyPercent,
    timeTakenSeconds,
    xpAwarded,
    coinsAwarded,
    newlyUnlockedAchievementIds: newlyUnlocked,
  }
  const results = readResults()
  results[sessionId] = result
  writeResults(results)
  return delay(result, 700)
}

export async function submitSession(sessionId: string): Promise<PracticeResult> {
  if (isRealId(sessionId)) return finishRealSession(sessionId)
  return finishMockSession(sessionId)
}

export async function getResult(sessionId: string): Promise<PracticeResult | null> {
  if (isRealId(sessionId)) {
    try {
      const response = await apiClient.get<{ data: BackendFinishResultDTO }>(
        endpoints.practice.result(sessionId),
      )
      return toFrontendResult(response.data.data)
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || error.response?.status === 400)
      ) {
        return null
      }
      throw error
    }
  }
  return delay(readResults()[sessionId] ?? null, 250)
}

// ---- Review — a submitted session's full, revealed answer key ----

async function getRealReview(sessionId: string): Promise<PracticeSession | null> {
  try {
    const response = await apiClient.get<{ data: BackendReviewDTO }>(
      endpoints.practice.review(sessionId),
    )
    const dto = response.data.data

    const questions: PracticeQuestion[] = dto.questions.map((q) => ({
      id: q.questionId,
      questionText: q.questionText,
      options: toFrontendOptions(q.options),
      correctOptionId: q.correctOptionId,
      explanation: q.standardExplanation,
      difficulty: 'medium',
      subjectName: dto.subjectName,
      topicName: dto.topicName,
      tags: [],
      hasAiExplanation: q.aiExplanation.eligible,
    }))
    realSessionQuestionsCache.set(sessionId, questions)

    const answers: Record<string, PracticeAnswer> = {}
    for (const q of dto.questions) {
      answers[q.questionId] = {
        questionId: q.questionId,
        selectedOptionId: q.selectedOptionId,
        markedForReview: false,
        hintUsed: false,
        isCorrect: q.isCorrect,
        correctOptionId: q.correctOptionId,
        explanation: q.standardExplanation,
      }
      primeQuestionBookmarkState(q.questionId, q.isBookmarked)
    }

    return {
      id: sessionId,
      mode: 'quiz',
      examCategory: '',
      subjectName: dto.subjectName,
      topicName: dto.topicName,
      timerType: 'soft',
      durationSeconds: 0,
      questionIds: dto.questions.map((q) => q.questionId),
      answers,
      startedAt: new Date().toISOString(),
      status: 'submitted',
    }
  } catch (error) {
    return notFoundToNull(error)
  }
}

/** Backs the Review screen — for a real session this is a distinct fetch
 * (`GET .../review`) that reveals the answer key + AI Explanation
 * entitlement per question, only ever valid once `status === 'submitted'`.
 * For a mock session, `getSession` already returns everything Review needs
 * (the mock bank embeds `correctOptionId`/`explanation` on every question
 * regardless of session status), so this is just an alias there. */
export async function getReview(sessionId: string): Promise<PracticeSession | null> {
  if (isRealId(sessionId)) return getRealReview(sessionId)
  return getSession(sessionId)
}

// ---- History — real-backend quiz sessions only ----

export type GetHistoryInput = {
  page?: number
  limit?: number
  subjectId?: string
  topicId?: string
  sort?: 'newest' | 'oldest'
}

export async function getPracticeHistory(
  input: GetHistoryInput = {},
): Promise<PracticeHistoryPage> {
  const response = await apiClient.get<{
    data: BackendHistoryItemDTO[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }>(endpoints.practice.history, {
    params: {
      page: input.page ?? 1,
      limit: input.limit ?? 10,
      subjectId: input.subjectId,
      topicId: input.topicId,
      sort: input.sort ?? 'newest',
    },
  })
  return {
    items: response.data.data,
    page: response.data.meta.page,
    limit: response.data.meta.limit,
    total: response.data.meta.total,
    totalPages: response.data.meta.totalPages,
  }
}

// ---- Achievement catalog (reuses Dashboard's `AchievementItem` shape) ----

const ACHIEVEMENT_DEFINITIONS: Record<
  MockOnlyAchievementId,
  Omit<AchievementItem, 'earned'>
> = {
  'first-100-questions': {
    id: 'first-100-questions',
    title: 'First 100 Questions Completed',
    description: 'Finished a full 100 Questions set',
  },
  'seven-day-streak': {
    id: 'seven-day-streak',
    title: '7-Day Practice Streak',
    description: 'Practiced 7 days in a row',
  },
  'first-mock-completed': {
    id: 'first-mock-completed',
    title: 'First Mock Test Finished',
    description: 'Completed your first full Mock Test',
  },
  'pyq-completionist': {
    id: 'pyq-completionist',
    title: 'PYQ Completionist',
    description: 'Completed a Previous Year Questions set',
  },
  comeback: {
    id: 'comeback',
    title: 'Comeback',
    description: 'Returned to practice after a break',
  },
}

export function getAchievementCatalog(): AchievementItem[] {
  const progress = readProgress()
  return (Object.keys(ACHIEVEMENT_DEFINITIONS) as MockOnlyAchievementId[]).map((id) => ({
    ...ACHIEVEMENT_DEFINITIONS[id],
    earned: progress.unlockedAchievementIds.includes(id),
  }))
}

export function getAchievementDefinition(
  id: MockOnlyAchievementId,
): Omit<AchievementItem, 'earned'> {
  return ACHIEVEMENT_DEFINITIONS[id]
}

export function getPracticeProgressSnapshot(): {
  xp: number
  coins: number
} {
  const progress = readProgress()
  return { xp: progress.xp, coins: progress.coins }
}
