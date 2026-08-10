import type { ExamCategoryCode } from '../constants/exam'
import type {
  PracticeDifficultyFilter,
  PracticeMode,
  TimerType,
} from '../constants/practice'
import type { SubscriptionTier } from '../constants/roles'
import type {
  IPracticeResult,
  PracticeSessionDocument,
} from '../models/PracticeSession.model'
import type { QuestionDocument } from '../models/Question.model'
import { GAMIFICATION_CONFIG } from '../config/gamification.config'
import * as bookmarkRepository from '../repositories/bookmark.repository'
import * as examRepository from '../repositories/exam.repository'
import * as practiceSessionRepository from '../repositories/practiceSession.repository'
import * as questionRepository from '../repositories/question.repository'
import * as questionAttemptRepository from '../repositories/questionAttempt.repository'
import type { QuestionAttemptRow } from '../repositories/questionAttempt.repository'
import * as subjectRepository from '../repositories/subject.repository'
import * as topicRepository from '../repositories/topic.repository'
import { ApiError } from '../utils/ApiError'
import { hasFeature } from './entitlement.service'
import * as gamificationService from './gamification.service'
import type { AchievementCatalogEntryDTO } from './gamification.service'
import {
  pickText,
  resolveDefaultExamId,
  resolveExamId,
  type DisplayLanguage,
} from './learn.service'

// ---- DTOs — deliberately never expose `isCorrect`/`isPremium` internals
// on an unanswered question, per this step's explicit answer-leakage rule. ----

export interface SanitizedOptionDTO {
  id: string
  text: string
}

export interface SanitizedQuestionDTO {
  id: string
  questionText: string
  questionImageUrl: string | null
  options: SanitizedOptionDTO[]
  difficulty: string
  hasAiExplanation: boolean
}

export interface SessionAnswerDTO {
  questionId: string
  selectedOptionId: string | null
  markedForReview: boolean
}

export interface PracticeSessionDTO {
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
  questions: SanitizedQuestionDTO[]
  answers: SessionAnswerDTO[]
}

export interface CreateSessionInput {
  examCategory?: ExamCategoryCode
  subjectSlug: string
  topicSlug: string
  questionCount: number
  difficulty: PracticeDifficultyFilter
}

export interface SubmitAnswerInput {
  questionId: string
  selectedOptionId: string
  responseTime: number
}

export interface SubmitAnswerResultDTO {
  isCorrect: boolean
  correctOptionId: string
  standardExplanation: string
}

export interface FinishSessionResultDTO {
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
  /** Real as of Sprint 4 Step 61 (Gamification System) — awarded once, the
   * moment this session is first submitted; a re-fetch of an
   * already-submitted session's result still reports the amounts (read from
   * the stored `session.result`), but `newlyUnlockedAchievements` is only
   * ever non-empty on the actual first-submission response. */
  xpAwarded: number
  coinsAwarded: number
  newlyUnlockedAchievements: AchievementCatalogEntryDTO[]
}

export interface ReviewQuestionDTO {
  questionId: string
  questionText: string
  options: SanitizedOptionDTO[]
  selectedOptionId: string | null
  correctOptionId: string
  isCorrect: boolean
  standardExplanation: string
  isBookmarked: boolean
  aiExplanation: {
    eligible: boolean
    entitled: boolean
  }
}

export interface SessionReviewDTO {
  sessionId: string
  subjectName: string
  topicName: string
  questions: ReviewQuestionDTO[]
}

export interface HistoryItemDTO {
  sessionId: string
  subjectName: string
  topicName: string
  totalQuestions: number
  correctCount: number
  accuracyPercent: number
  submittedAt: string
}

export interface HistoryPageDTO {
  items: HistoryItemDTO[]
  page: number
  limit: number
  total: number
  totalPages: number
}

// ---- helpers ----

export function sanitizeQuestion(
  question: QuestionDocument,
  lang: DisplayLanguage,
): SanitizedQuestionDTO {
  return {
    id: question._id.toString(),
    questionText: pickText(question.questionText, lang),
    questionImageUrl: question.questionImageUrl ?? null,
    options: question.options.map((option) => ({
      id: option.optionId,
      text: pickText(option.text, lang),
    })),
    difficulty: question.difficulty,
    hasAiExplanation: question.aiExplanationEligible,
  }
}

export function explanationText(
  question: QuestionDocument,
  lang: DisplayLanguage,
): string {
  return question.explanation
    ? pickText(question.explanation, lang)
    : 'No explanation is available for this question yet.'
}

/** Exported for `services/ai/questionExplanation.service.ts` (Sprint 4 Step
 * 57) — the AI explanation flow needs the same real, ownership-checked
 * session lookup (and the student's actual recorded answer inside it),
 * never a client-supplied `selectedOptionId`. */
export async function requireOwnedSession(
  userId: string,
  sessionId: string,
): Promise<PracticeSessionDocument> {
  const session = await practiceSessionRepository.findByIdForUser(sessionId, userId)
  if (!session) throw ApiError.notFound('Practice session not found')
  return session
}

async function buildSessionDTO(
  session: PracticeSessionDocument,
  lang: DisplayLanguage,
): Promise<PracticeSessionDTO> {
  const [subject, topic, exam, questions] = await Promise.all([
    subjectRepository.findById(session.subjectId!),
    topicRepository.findById(session.topicId!),
    session.examId ? examRepository.findById(session.examId) : Promise.resolve(null),
    questionRepository.findByIds(session.questionIds),
  ])
  if (!subject || !topic)
    throw ApiError.internal('This practice session references missing content.')

  const questionMap = new Map(
    questions.map((question) => [question._id.toString(), question]),
  )
  const orderedQuestions = session.questionIds
    .map((id) => questionMap.get(id.toString()))
    .filter((question): question is QuestionDocument => Boolean(question))

  const answers: SessionAnswerDTO[] = session.answers.map((answer) => ({
    questionId: answer.questionId.toString(),
    selectedOptionId: answer.selectedOptionId,
    markedForReview: answer.markedForReview,
  }))

  return {
    id: session.id,
    mode: session.mode,
    examId: exam?.code ?? null,
    subjectId: subject.slug,
    subjectName: pickText(subject.name, lang),
    topicId: topic.slug,
    topicName: pickText(topic.name, lang),
    timerType: session.timerType,
    durationSeconds: session.durationSeconds,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    questions: orderedQuestions.map((question) => sanitizeQuestion(question, lang)),
    answers,
  }
}

function computeResult(
  session: PracticeSessionDocument,
  attempts: QuestionAttemptRow[],
): IPracticeResult {
  const latestAttemptByQuestion = new Map<string, QuestionAttemptRow>()
  // `attempts` is sorted oldest-first (repository) — later entries in this
  // loop overwrite earlier ones, so a re-answered question counts once,
  // using its most recent (current) answer.
  for (const attempt of attempts) {
    latestAttemptByQuestion.set(attempt.questionId.toString(), attempt)
  }

  let correctCount = 0
  let incorrectCount = 0
  let answeredCount = 0

  for (const questionId of session.questionIds) {
    const attempt = latestAttemptByQuestion.get(questionId.toString())
    if (!attempt || attempt.selectedOptionId === null) continue
    answeredCount += 1
    if (attempt.isCorrect) correctCount += 1
    else incorrectCount += 1
  }

  const totalQuestions = session.questionIds.length
  const skippedCount = totalQuestions - answeredCount
  const accuracyPercent =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 1000) / 10 : 0
  const timeTakenSeconds = Math.max(
    0,
    Math.round((Date.now() - session.startedAt.getTime()) / 1000),
  )

  // Real as of Sprint 4 Step 61 (Gamification System) — same published
  // amounts already live in the frontend's mock (`practiceSessionService.ts`,
  // `docs/Smart_Practice.md` §13-14), migrated to the real backend rather
  // than inventing new numbers. A pure calculation here — the actual
  // Profile/ledger write happens in `finishSession`, once, only on genuine
  // first submission.
  const xp = GAMIFICATION_CONFIG.xp
  const coins = GAMIFICATION_CONFIG.coins
  const xpAwarded =
    answeredCount * xp.practicePerQuestionAnswered +
    correctCount * xp.practicePerCorrectBonus +
    xp.practiceSessionCompletionBonus
  const coinsAwarded =
    correctCount * coins.practicePerCorrectAnswer + coins.practiceSessionCompletionBonus

  return {
    totalQuestions,
    correctCount,
    incorrectCount,
    skippedCount,
    accuracyPercent,
    timeTakenSeconds,
    xpAwarded,
    coinsAwarded,
  }
}

async function buildFinishDTO(
  session: PracticeSessionDocument,
  lang: DisplayLanguage,
  newlyUnlockedAchievements: AchievementCatalogEntryDTO[] = [],
): Promise<FinishSessionResultDTO> {
  if (!session.result) {
    throw ApiError.internal('This practice session has no computed result yet.')
  }

  const [subject, topic, attempts] = await Promise.all([
    subjectRepository.findById(session.subjectId!),
    topicRepository.findById(session.topicId!),
    questionAttemptRepository.findBySession(session.id),
  ])

  const answeredAttempts = attempts.filter((attempt) => attempt.selectedOptionId !== null)
  const averageResponseTimeSeconds =
    answeredAttempts.length > 0
      ? Math.round(
          (answeredAttempts.reduce((sum, attempt) => sum + attempt.timeTakenSeconds, 0) /
            answeredAttempts.length) *
            10,
        ) / 10
      : 0

  return {
    sessionId: session.id,
    totalQuestions: session.result.totalQuestions,
    correctCount: session.result.correctCount,
    incorrectCount: session.result.incorrectCount,
    unansweredCount: session.result.skippedCount,
    score: session.result.correctCount,
    accuracyPercent: session.result.accuracyPercent,
    timeTakenSeconds: session.result.timeTakenSeconds,
    averageResponseTimeSeconds,
    subjectName: subject ? pickText(subject.name, lang) : '',
    topicName: topic ? pickText(topic.name, lang) : '',
    xpAwarded: session.result.xpAwarded,
    coinsAwarded: session.result.coinsAwarded,
    newlyUnlockedAchievements,
  }
}

// ---- Session creation ----

export async function createSession(
  userId: string,
  input: CreateSessionInput,
  lang: DisplayLanguage,
): Promise<PracticeSessionDTO> {
  const subject = await subjectRepository.findBySlug(input.subjectSlug)
  if (!subject) throw ApiError.notFound('Subject not found')

  const topic = await topicRepository.findBySlug(input.topicSlug)
  if (!topic || topic.subjectId.toString() !== subject._id.toString()) {
    throw ApiError.notFound('Topic not found')
  }

  const examId =
    (await resolveExamId(input.examCategory)) ?? (await resolveDefaultExamId(userId))

  const difficulty = input.difficulty === 'all' ? undefined : input.difficulty
  const questionIds = await questionRepository.findRandomQuestionIds(
    { topicId: topic._id, difficulty },
    input.questionCount,
  )
  if (questionIds.length === 0) {
    throw ApiError.badRequest(
      'No active questions are available for this topic yet. Try a different topic or difficulty.',
      { code: 'INSUFFICIENT_QUESTIONS_AVAILABLE' },
    )
  }

  // Soft timer (never force-submits, per docs/Smart_Practice.md §2/§3 —
  // Topic Quiz is an adaptive-family mode) — durationSeconds is only a
  // pacing reference, ~90s/question, floor of 5 minutes.
  const durationSeconds = Math.max(questionIds.length * 90, 300)

  const session = await practiceSessionRepository.create({
    userId,
    mode: 'quiz',
    examId,
    subjectId: subject._id,
    topicId: topic._id,
    questionIds,
    timerType: 'soft',
    durationSeconds,
  })

  return buildSessionDTO(session, lang)
}

export async function getSession(
  userId: string,
  sessionId: string,
  lang: DisplayLanguage,
): Promise<PracticeSessionDTO> {
  const session = await requireOwnedSession(userId, sessionId)
  return buildSessionDTO(session, lang)
}

// ---- Answering ----

export async function submitAnswer(
  userId: string,
  sessionId: string,
  input: SubmitAnswerInput,
  lang: DisplayLanguage,
): Promise<SubmitAnswerResultDTO> {
  const session = await requireOwnedSession(userId, sessionId)
  if (session.status !== 'in-progress') {
    throw ApiError.conflict('This practice session has already been submitted.')
  }

  const belongsToSession = session.questionIds.some(
    (id) => id.toString() === input.questionId,
  )
  if (!belongsToSession) {
    throw ApiError.badRequest('This question is not part of the requested session.')
  }

  const question = await questionRepository.findById(input.questionId)
  if (!question) throw ApiError.notFound('Question not found')

  const selectedOption = question.options.find(
    (option) => option.optionId === input.selectedOptionId,
  )
  if (!selectedOption) {
    throw ApiError.badRequest(
      'selectedOptionId does not match any option on this question.',
    )
  }
  const correctOption = question.options.find((option) => option.isCorrect)
  if (!correctOption)
    throw ApiError.internal('This question has no correct option configured.')

  const isCorrect = selectedOption.isCorrect

  await practiceSessionRepository.upsertAnswer(sessionId, userId, input.questionId, {
    selectedOptionId: input.selectedOptionId,
  })

  await questionAttemptRepository.create({
    userId,
    questionId: input.questionId,
    sessionId,
    mode: session.mode,
    selectedOptionId: input.selectedOptionId,
    isCorrect,
    timeTakenSeconds: Math.max(0, Math.round(input.responseTime)),
  })

  return {
    isCorrect,
    correctOptionId: correctOption.optionId,
    standardExplanation: explanationText(question, lang),
  }
}

// ---- Finishing / results ----

export async function finishSession(
  userId: string,
  sessionId: string,
  lang: DisplayLanguage,
): Promise<FinishSessionResultDTO> {
  const session = await requireOwnedSession(userId, sessionId)

  if (session.status === 'in-progress') {
    const attempts = await questionAttemptRepository.findBySession(sessionId)
    const result = computeResult(session, attempts)
    const updated = await practiceSessionRepository.submit(sessionId, userId, result)
    if (!updated)
      throw ApiError.conflict('This practice session has already been submitted.')

    // Sprint 4 Step 61 — the real Profile/ledger/streak/achievement write,
    // exactly once, only on genuine first submission (never on the
    // idempotent re-fetch branch below).
    const award = await gamificationService.awardXp(userId, {
      reason: 'practice_completion',
      xpAmount: result.xpAwarded,
      coinsAmount: result.coinsAwarded,
      refId: sessionId,
    })
    return buildFinishDTO(updated, lang, award.newlyUnlockedAchievements)
  }

  // Idempotent — resubmitting an already-submitted session returns the
  // same cached result rather than erroring destructively.
  return buildFinishDTO(session, lang)
}

export async function getResult(
  userId: string,
  sessionId: string,
  lang: DisplayLanguage,
): Promise<FinishSessionResultDTO> {
  const session = await requireOwnedSession(userId, sessionId)
  if (session.status !== 'submitted' || !session.result) {
    throw ApiError.badRequest('This practice session has not been submitted yet.')
  }
  return buildFinishDTO(session, lang)
}

// ---- Review ----

export async function getReview(
  userId: string,
  sessionId: string,
  subscriptionTier: SubscriptionTier,
  lang: DisplayLanguage,
): Promise<SessionReviewDTO> {
  const session = await requireOwnedSession(userId, sessionId)
  if (session.status !== 'submitted') {
    throw ApiError.badRequest('Finish this practice session before reviewing it.')
  }

  const [questions, subject, topic, bookmarks] = await Promise.all([
    questionRepository.findByIds(session.questionIds),
    subjectRepository.findById(session.subjectId!),
    topicRepository.findById(session.topicId!),
    bookmarkRepository.findByUser(userId, 'question'),
  ])

  const questionMap = new Map(
    questions.map((question) => [question._id.toString(), question]),
  )
  const answerMap = new Map(
    session.answers.map((answer) => [answer.questionId.toString(), answer]),
  )
  const bookmarkedQuestionIds = new Set(
    bookmarks.map((bookmark) => bookmark.contentId.toString()),
  )

  const orderedQuestions = session.questionIds
    .map((id) => questionMap.get(id.toString()))
    .filter((question): question is QuestionDocument => Boolean(question))

  // Free users see Standard Explanation only — AI Explanation stays UI-gated
  // (entitlement + placeholder state), per this step's explicit "connect
  // provider in Sprint 4" boundary. Entitlement is decided centrally by
  // `entitlement.service.ts` (Sprint 4 Step 55), never re-derived here.
  const entitled = hasFeature(subscriptionTier, 'ai_explanations')

  return {
    sessionId: session.id,
    subjectName: subject ? pickText(subject.name, lang) : '',
    topicName: topic ? pickText(topic.name, lang) : '',
    questions: orderedQuestions.map((question) => {
      const answer = answerMap.get(question._id.toString())
      const correctOption = question.options.find((option) => option.isCorrect)
      const selectedOptionId = answer?.selectedOptionId ?? null

      return {
        questionId: question._id.toString(),
        questionText: pickText(question.questionText, lang),
        options: question.options.map((option) => ({
          id: option.optionId,
          text: pickText(option.text, lang),
        })),
        selectedOptionId,
        correctOptionId: correctOption?.optionId ?? '',
        isCorrect: Boolean(
          selectedOptionId &&
          correctOption &&
          selectedOptionId === correctOption.optionId,
        ),
        standardExplanation: explanationText(question, lang),
        isBookmarked: bookmarkedQuestionIds.has(question._id.toString()),
        aiExplanation: {
          eligible: question.aiExplanationEligible,
          entitled,
        },
      }
    }),
  }
}

// ---- History ----

export interface HistoryFilterInput {
  subjectSlug?: string
  topicSlug?: string
}

export async function getHistory(
  userId: string,
  filter: HistoryFilterInput,
  page: number,
  limit: number,
  sort: 'newest' | 'oldest',
  lang: DisplayLanguage,
): Promise<HistoryPageDTO> {
  const [subject, topic] = await Promise.all([
    filter.subjectSlug
      ? subjectRepository.findBySlug(filter.subjectSlug)
      : Promise.resolve(null),
    filter.topicSlug
      ? topicRepository.findBySlug(filter.topicSlug)
      : Promise.resolve(null),
  ])

  const { sessions, total } = await practiceSessionRepository.findHistoryByUser(
    userId,
    { subjectId: subject?._id, topicId: topic?._id },
    page,
    limit,
    sort,
  )

  const subjectIds = [
    ...new Set(sessions.map((session) => session.subjectId?.toString())),
  ].filter((id): id is string => Boolean(id))
  const topicIds = [
    ...new Set(sessions.map((session) => session.topicId?.toString())),
  ].filter((id): id is string => Boolean(id))
  const [subjects, topics] = await Promise.all([
    Promise.all(subjectIds.map((id) => subjectRepository.findById(id))),
    Promise.all(topicIds.map((id) => topicRepository.findById(id))),
  ])
  const subjectMap = new Map(
    subjects.filter((doc) => doc !== null).map((doc) => [doc._id.toString(), doc]),
  )
  const topicMap = new Map(
    topics.filter((doc) => doc !== null).map((doc) => [doc._id.toString(), doc]),
  )

  const items: HistoryItemDTO[] = sessions.map((session) => {
    const subjectDoc = session.subjectId
      ? subjectMap.get(session.subjectId.toString())
      : undefined
    const topicDoc = session.topicId
      ? topicMap.get(session.topicId.toString())
      : undefined
    return {
      sessionId: session.id,
      subjectName: subjectDoc ? pickText(subjectDoc.name, lang) : '',
      topicName: topicDoc ? pickText(topicDoc.name, lang) : '',
      totalQuestions: session.result?.totalQuestions ?? session.questionIds.length,
      correctCount: session.result?.correctCount ?? 0,
      accuracyPercent: session.result?.accuracyPercent ?? 0,
      submittedAt: (session.submittedAt ?? session.startedAt).toISOString(),
    }
  })

  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
}
