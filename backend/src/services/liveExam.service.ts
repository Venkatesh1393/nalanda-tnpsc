import type { ExamCategoryCode } from '../constants/exam'
import type {
  LiveExamAttemptStatus,
  LiveExamStatus,
  LiveExamTab,
  ResultPublicationMode,
} from '../constants/liveExam'
import type { SubscriptionTier } from '../constants/roles'
import type { LiveExamDocument } from '../models/LiveExam.model'
import type { LiveExamAttemptDocument } from '../models/LiveExamAttempt.model'
import type { QuestionDocument } from '../models/Question.model'
import type { SubjectDocument } from '../models/Subject.model'
import { GAMIFICATION_CONFIG } from '../config/gamification.config'
import * as examRepository from '../repositories/exam.repository'
import * as liveExamRepository from '../repositories/liveExam.repository'
import * as liveExamAttemptRepository from '../repositories/liveExamAttempt.repository'
import * as questionRepository from '../repositories/question.repository'
import * as subjectRepository from '../repositories/subject.repository'
import { ApiError } from '../utils/ApiError'
import { hasFeature } from './entitlement.service'
import * as gamificationService from './gamification.service'
import {
  pickText,
  resolveDefaultExamId,
  resolveExamId,
  type DisplayLanguage,
} from './learn.service'
import {
  explanationText,
  sanitizeQuestion,
  type SanitizedQuestionDTO,
} from './practice.service'

// ---- Effective status — always computed from server time, never trusted
// from the stored `status` alone (Step 48's explicit security rule). ----

export type LiveExamEffectiveStatus = 'upcoming' | 'live' | 'completed' | 'cancelled'

/** Exported for `services/admin/adminLiveExams.service.ts` to reuse
 * unchanged (Step 54) — the admin "publish results" action needs the exact
 * same "is this exam actually over" answer the student-facing read path
 * uses, never a second, potentially-drifting copy of this logic. */
export function computeEffectiveStatus(
  exam: Pick<LiveExamDocument, 'status' | 'scheduledStartAt' | 'scheduledEndAt'>,
  now: Date,
): LiveExamEffectiveStatus {
  if (exam.status === 'cancelled') return 'cancelled'
  if (now < exam.scheduledStartAt) return 'upcoming'
  if (now <= exam.scheduledEndAt) return 'live'
  return 'completed'
}

/** A student's personal countdown target — capped at the cohort's hard
 * close so joining late never grants more time than the group has left. */
function computeDeadline(attempt: LiveExamAttemptDocument, exam: LiveExamDocument): Date {
  const personalDeadline = new Date(
    attempt.startedAt.getTime() + exam.durationMinutes * 60_000,
  )
  return personalDeadline < exam.scheduledEndAt ? personalDeadline : exam.scheduledEndAt
}

function isResultPublished(exam: LiveExamDocument, now: Date): boolean {
  // The admin manual-publish override (Step 54) always wins when present —
  // checked before the time-derived rules below, and independent of `mode`.
  if (exam.resultPublication.publishedAt) {
    return now >= exam.resultPublication.publishedAt
  }
  if (now < exam.scheduledEndAt) return false
  if (exam.resultPublication.mode === 'immediate') return true
  return (
    Boolean(exam.resultPublication.publishAt) && now >= exam.resultPublication.publishAt!
  )
}

function computePublishAt(exam: LiveExamDocument): string {
  if (exam.resultPublication.publishedAt) {
    return exam.resultPublication.publishedAt.toISOString()
  }
  if (exam.resultPublication.mode === 'scheduled' && exam.resultPublication.publishAt) {
    return exam.resultPublication.publishAt.toISOString()
  }
  return exam.scheduledEndAt.toISOString()
}

interface ScoredAttempt {
  score: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
}

async function scoreAttempt(
  attempt: LiveExamAttemptDocument,
  exam: LiveExamDocument,
): Promise<ScoredAttempt> {
  const questions = await questionRepository.findByIds(exam.questionIds)
  const questionMap = new Map(questions.map((q) => [q._id.toString(), q]))
  const answerMap = new Map(attempt.answers.map((a) => [a.questionId.toString(), a]))

  let correctCount = 0
  let incorrectCount = 0
  let unansweredCount = 0
  let score = 0

  for (const questionId of exam.questionIds) {
    const question = questionMap.get(questionId.toString())
    if (!question) continue
    const answer = answerMap.get(questionId.toString())

    if (!answer || answer.selectedOptionId === null) {
      unansweredCount += 1
      continue
    }

    const correctOption = question.options.find((option) => option.isCorrect)
    if (correctOption && answer.selectedOptionId === correctOption.optionId) {
      correctCount += 1
      score += exam.marksPerQuestion
    } else {
      incorrectCount += 1
      if (exam.negativeMarking.enabled) score -= exam.negativeMarking.marksPerWrongAnswer
    }
  }

  return {
    score: Math.round(score * 100) / 100,
    correctCount,
    incorrectCount,
    unansweredCount,
  }
}

/** Lazily finalizes an attempt whose personal or cohort deadline has
 * passed but was never explicitly submitted (tab closed, app crashed,
 * client timer never fired) — checked at the top of every attempt-touching
 * function, so no cron/background job is required (Step 48's "auto-submit
 * where technically appropriate," applied server-side as a safety net on
 * top of the frontend's own timer-driven submit call). */
async function ensureFinalized(
  attempt: LiveExamAttemptDocument,
  exam: LiveExamDocument,
): Promise<LiveExamAttemptDocument> {
  if (attempt.status !== 'in-progress') return attempt
  if (new Date() <= computeDeadline(attempt, exam)) return attempt

  const scored = await scoreAttempt(attempt, exam)
  const updated = await liveExamAttemptRepository.submit(attempt.id, {
    submissionType: 'auto',
    ...scored,
  })
  // Sprint 4 Step 61 — this lazy deadline-triggered auto-submit is a real
  // "the student participated in this Weekly Live Exam" completion event,
  // exactly as genuine as an explicit Finish tap (docs/Live_Exam's own
  // "top of the frontend's own timer-driven submit call" design) — awarded
  // here, the one place this transition actually happens for this path.
  if (updated) {
    await gamificationService.awardXp(attempt.userId.toString(), {
      reason: 'live_exam_participation',
      xpAmount: GAMIFICATION_CONFIG.xp.liveExamParticipation,
      coinsAmount: GAMIFICATION_CONFIG.coins.liveExamParticipation,
      refId: attempt.id,
    })
  }
  return updated ?? attempt
}

// ---- DTOs ----

export interface LiveExamListItemDTO {
  id: string
  title: string
  description: string
  examCategory: string
  subjectNames: string[]
  scheduledStartAt: string
  scheduledEndAt: string
  durationMinutes: number
  totalQuestions: number
  totalMarks: number
  status: LiveExamStatus
  effectiveStatus: LiveExamEffectiveStatus
  myAttemptStatus: LiveExamAttemptStatus | null
}

export interface LiveExamDetailDTO extends LiveExamListItemDTO {
  instructions: string[]
  negativeMarking: { enabled: boolean; marksPerWrongAnswer: number }
  marksPerQuestion: number
  resultPublication: { mode: ResultPublicationMode; publishAt: string | null }
  serverTime: string
}

export interface AttemptAnswerDTO {
  questionId: string
  selectedOptionId: string | null
  markedForReview: boolean
}

export interface AttemptStateDTO {
  attemptId: string
  liveExamId: string
  status: LiveExamAttemptStatus
  startedAt: string
  deadlineAt: string
  serverTime: string
  questions: SanitizedQuestionDTO[]
  answers: AttemptAnswerDTO[]
}

export interface SubmitAnswerInput {
  questionId: string
  selectedOptionId?: string | null
  markedForReview?: boolean
}

export interface FinishAttemptDTO {
  attemptId: string
  status: 'submitted'
  submittedAt: string
}

export interface ResultReviewQuestionDTO {
  questionId: string
  questionText: string
  options: { id: string; text: string }[]
  selectedOptionId: string | null
  correctOptionId: string
  isCorrect: boolean
  explanation: string
}

export interface LiveExamResultDTO {
  available: boolean
  publishAt: string
  serverTime: string
  result?: {
    score: number
    totalMarks: number
    correctCount: number
    incorrectCount: number
    unansweredCount: number
    totalQuestions: number
    accuracyPercent: number
    timeTakenSeconds: number
    questions: ResultReviewQuestionDTO[]
  }
}

export interface MyAttemptItemDTO {
  attemptId: string
  liveExamId: string
  examTitle: string
  examCategory: string
  status: LiveExamAttemptStatus
  startedAt: string
  submittedAt: string | null
  resultAvailable: boolean
  score: number | null
  totalMarks: number | null
}

// ---- Listing ----

export async function getList(
  userId: string,
  tab: LiveExamTab,
  examCategory: ExamCategoryCode | undefined,
  lang: DisplayLanguage,
): Promise<LiveExamListItemDTO[]> {
  const examId =
    (await resolveExamId(examCategory)) ?? (await resolveDefaultExamId(userId))
  const now = new Date()
  const exams = await liveExamRepository.findByTab({ tab, now, examId })
  if (exams.length === 0) return []

  const attempts = await liveExamAttemptRepository.findByUserAndExamIds(
    userId,
    exams.map((exam) => exam._id),
  )
  const attemptByExam = new Map(
    attempts.map((attempt) => [attempt.liveExamId.toString(), attempt]),
  )

  const { examCodeById, subjectById } = await buildLookupCaches(exams)

  return exams.map((exam) =>
    toListItemDTO(exam, examCodeById, subjectById, attemptByExam.get(exam.id), now, lang),
  )
}

async function buildLookupCaches(exams: LiveExamDocument[]): Promise<{
  examCodeById: Map<string, string>
  subjectById: Map<string, SubjectDocument>
}> {
  const examIds = [...new Set(exams.map((exam) => exam.examId.toString()))]
  const subjectIds = [
    ...new Set(exams.flatMap((exam) => exam.subjectIds.map((id) => id.toString()))),
  ]

  const [examDocs, subjectDocs] = await Promise.all([
    Promise.all(examIds.map((id) => examRepository.findById(id))),
    Promise.all(subjectIds.map((id) => subjectRepository.findById(id))),
  ])

  const examCodeById = new Map<string, string>()
  examIds.forEach((id, index) => examCodeById.set(id, examDocs[index]?.code ?? ''))

  const subjectById = new Map<string, SubjectDocument>()
  subjectIds.forEach((id, index) => {
    const doc = subjectDocs[index]
    if (doc) subjectById.set(id, doc)
  })

  return { examCodeById, subjectById }
}

function toListItemDTO(
  exam: LiveExamDocument,
  examCodeById: Map<string, string>,
  subjectById: Map<string, SubjectDocument>,
  attempt: LiveExamAttemptDocument | undefined,
  now: Date,
  lang: DisplayLanguage,
): LiveExamListItemDTO {
  return {
    id: exam.id,
    title: pickText(exam.title, lang),
    description: pickText(exam.description, lang),
    examCategory: examCodeById.get(exam.examId.toString()) ?? '',
    subjectNames: exam.subjectIds
      .map((id) => subjectById.get(id.toString()))
      .filter((subject): subject is SubjectDocument => Boolean(subject))
      .map((subject) => pickText(subject.name, lang)),
    scheduledStartAt: exam.scheduledStartAt.toISOString(),
    scheduledEndAt: exam.scheduledEndAt.toISOString(),
    durationMinutes: exam.durationMinutes,
    totalQuestions: exam.totalQuestions,
    totalMarks: exam.totalMarks,
    status: exam.status,
    effectiveStatus: computeEffectiveStatus(exam, now),
    myAttemptStatus: attempt?.status ?? null,
  }
}

export async function getDetail(
  userId: string,
  liveExamId: string,
  lang: DisplayLanguage,
): Promise<LiveExamDetailDTO> {
  const exam = await liveExamRepository.findById(liveExamId)
  if (!exam) throw ApiError.notFound('Live exam not found')

  const now = new Date()
  const [{ examCodeById, subjectById }, attempt] = await Promise.all([
    buildLookupCaches([exam]),
    liveExamAttemptRepository.findOne(userId, liveExamId),
  ])

  const listItem = toListItemDTO(
    exam,
    examCodeById,
    subjectById,
    attempt ?? undefined,
    now,
    lang,
  )
  const instructions =
    lang === 'ta' && exam.instructions.ta.length > 0
      ? exam.instructions.ta
      : exam.instructions.en

  return {
    ...listItem,
    instructions,
    negativeMarking: {
      enabled: exam.negativeMarking.enabled,
      marksPerWrongAnswer: exam.negativeMarking.marksPerWrongAnswer,
    },
    marksPerQuestion: exam.marksPerQuestion,
    resultPublication: {
      mode: exam.resultPublication.mode,
      publishAt: exam.resultPublication.publishAt?.toISOString() ?? null,
    },
    serverTime: now.toISOString(),
  }
}

// ---- Attempt lifecycle ----

async function buildAttemptStateDTO(
  attempt: LiveExamAttemptDocument,
  exam: LiveExamDocument,
  lang: DisplayLanguage,
): Promise<AttemptStateDTO> {
  const questions = await questionRepository.findByIds(exam.questionIds)
  const questionMap = new Map(
    questions.map((question) => [question._id.toString(), question]),
  )
  const orderedQuestions = exam.questionIds
    .map((id) => questionMap.get(id.toString()))
    .filter((question): question is QuestionDocument => Boolean(question))

  return {
    attemptId: attempt.id,
    liveExamId: exam.id,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    deadlineAt: computeDeadline(attempt, exam).toISOString(),
    serverTime: new Date().toISOString(),
    questions: orderedQuestions.map((question) => sanitizeQuestion(question, lang)),
    answers: attempt.answers.map((answer) => ({
      questionId: answer.questionId.toString(),
      selectedOptionId: answer.selectedOptionId,
      markedForReview: answer.markedForReview,
    })),
  }
}

/** "Join" and "Start" are the same real-world moment for a live exam (no
 * separate advance-registration step exists in this build, Step 48's
 * described flow) — idempotent get-or-create, so re-clicking "Start" on an
 * already-joined exam just resumes it. */
export async function joinLiveExam(
  userId: string,
  liveExamId: string,
  subscriptionTier: SubscriptionTier,
  lang: DisplayLanguage,
): Promise<AttemptStateDTO> {
  if (!hasFeature(subscriptionTier, 'additional_mock_exams')) {
    throw ApiError.forbidden('Live Exams require a Plus subscription or higher.')
  }

  const exam = await liveExamRepository.findById(liveExamId)
  if (!exam) throw ApiError.notFound('Live exam not found')

  const now = new Date()
  const effectiveStatus = computeEffectiveStatus(exam, now)
  if (effectiveStatus !== 'live') {
    const message =
      effectiveStatus === 'upcoming'
        ? 'This live exam has not started yet.'
        : effectiveStatus === 'cancelled'
          ? 'This live exam has been cancelled.'
          : 'This live exam has already ended.'
    throw ApiError.badRequest(message)
  }

  let attempt = await liveExamAttemptRepository.findOne(userId, liveExamId)
  attempt = attempt
    ? await ensureFinalized(attempt, exam)
    : await liveExamAttemptRepository.create({ userId, liveExamId, startedAt: now })

  return buildAttemptStateDTO(attempt, exam, lang)
}

export async function getAttempt(
  userId: string,
  liveExamId: string,
  lang: DisplayLanguage,
): Promise<AttemptStateDTO> {
  const exam = await liveExamRepository.findById(liveExamId)
  if (!exam) throw ApiError.notFound('Live exam not found')

  const attempt = await liveExamAttemptRepository.findOne(userId, liveExamId)
  if (!attempt) throw ApiError.notFound('You have not joined this live exam yet.')

  const finalized = await ensureFinalized(attempt, exam)
  return buildAttemptStateDTO(finalized, exam, lang)
}

/** No correctness is ever returned here — Live Exam never reveals mid-exam
 * (`docs/Smart_Practice.md` §2/§11's hard-timer, non-adaptive, faithful-
 * exam-simulation boundary; distinct from Practice's immediate reveal). */
export async function submitAnswer(
  userId: string,
  liveExamId: string,
  input: SubmitAnswerInput,
): Promise<{ saved: true; savedAt: string }> {
  const exam = await liveExamRepository.findById(liveExamId)
  if (!exam) throw ApiError.notFound('Live exam not found')

  const attempt = await liveExamAttemptRepository.findOne(userId, liveExamId)
  if (!attempt) throw ApiError.notFound('You have not joined this live exam yet.')

  const finalized = await ensureFinalized(attempt, exam)
  if (finalized.status !== 'in-progress') {
    throw ApiError.conflict('This live exam attempt has already been submitted.')
  }

  const belongsToExam = exam.questionIds.some((id) => id.toString() === input.questionId)
  if (!belongsToExam) {
    throw ApiError.badRequest('This question is not part of this live exam.')
  }

  await liveExamAttemptRepository.upsertAnswer(finalized.id, userId, input.questionId, {
    selectedOptionId: input.selectedOptionId,
    markedForReview: input.markedForReview,
  })

  return { saved: true, savedAt: new Date().toISOString() }
}

export async function finishAttempt(
  userId: string,
  liveExamId: string,
): Promise<FinishAttemptDTO> {
  const exam = await liveExamRepository.findById(liveExamId)
  if (!exam) throw ApiError.notFound('Live exam not found')

  const attempt = await liveExamAttemptRepository.findOne(userId, liveExamId)
  if (!attempt) throw ApiError.notFound('You have not joined this live exam yet.')

  if (attempt.status === 'submitted') {
    return {
      attemptId: attempt.id,
      status: 'submitted',
      submittedAt: (attempt.submittedAt ?? attempt.startedAt).toISOString(),
    }
  }

  const scored = await scoreAttempt(attempt, exam)
  const updated = await liveExamAttemptRepository.submit(attempt.id, {
    submissionType: 'manual',
    ...scored,
  })
  // Sprint 4 Step 61 — real completion award, exactly once. `updated` is
  // only non-null when this call itself performed the transition (not a
  // race lost to the auto-submit path, which already awarded it above).
  if (updated) {
    await gamificationService.awardXp(userId, {
      reason: 'live_exam_participation',
      xpAmount: GAMIFICATION_CONFIG.xp.liveExamParticipation,
      coinsAmount: GAMIFICATION_CONFIG.coins.liveExamParticipation,
      refId: attempt.id,
    })
  }

  // Idempotent — a race with the lazy auto-submit path (e.g. the deadline
  // passed a moment before this request landed) resolves to the same
  // already-submitted state rather than a destructive error.
  const finalAttempt =
    updated ?? (await liveExamAttemptRepository.findOne(userId, liveExamId))
  if (!finalAttempt)
    throw ApiError.internal('This attempt could not be found after submission.')

  return {
    attemptId: finalAttempt.id,
    status: 'submitted',
    submittedAt: (finalAttempt.submittedAt ?? finalAttempt.startedAt).toISOString(),
  }
}

// ---- Result ----

export async function getResult(
  userId: string,
  liveExamId: string,
  lang: DisplayLanguage,
): Promise<LiveExamResultDTO> {
  const exam = await liveExamRepository.findById(liveExamId)
  if (!exam) throw ApiError.notFound('Live exam not found')

  const attempt = await liveExamAttemptRepository.findOne(userId, liveExamId)
  if (!attempt) throw ApiError.notFound('You have not joined this live exam yet.')

  const finalized = await ensureFinalized(attempt, exam)
  if (finalized.status !== 'submitted') {
    throw ApiError.badRequest('Submit this live exam before viewing your result.')
  }

  const now = new Date()
  const publishAt = computePublishAt(exam)
  if (!isResultPublished(exam, now)) {
    return { available: false, publishAt, serverTime: now.toISOString() }
  }

  const questions = await questionRepository.findByIds(exam.questionIds)
  const questionMap = new Map(
    questions.map((question) => [question._id.toString(), question]),
  )
  const answerMap = new Map(
    finalized.answers.map((answer) => [answer.questionId.toString(), answer]),
  )

  const reviewQuestions: ResultReviewQuestionDTO[] = exam.questionIds
    .map((id) => questionMap.get(id.toString()))
    .filter((question): question is QuestionDocument => Boolean(question))
    .map((question) => {
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
        explanation: explanationText(question, lang),
      }
    })

  const timeTakenSeconds = finalized.submittedAt
    ? Math.max(
        0,
        Math.round(
          (finalized.submittedAt.getTime() - finalized.startedAt.getTime()) / 1000,
        ),
      )
    : 0
  const answeredCount = finalized.correctCount + finalized.incorrectCount
  const accuracyPercent =
    answeredCount > 0
      ? Math.round((finalized.correctCount / answeredCount) * 1000) / 10
      : 0

  return {
    available: true,
    publishAt,
    serverTime: now.toISOString(),
    result: {
      score: finalized.score,
      totalMarks: exam.totalMarks,
      correctCount: finalized.correctCount,
      incorrectCount: finalized.incorrectCount,
      unansweredCount: finalized.unansweredCount,
      totalQuestions: exam.totalQuestions,
      accuracyPercent,
      timeTakenSeconds,
      questions: reviewQuestions,
    },
  }
}

// ---- My Attempts ----

export async function getMyAttempts(
  userId: string,
  lang: DisplayLanguage,
): Promise<MyAttemptItemDTO[]> {
  const attempts = await liveExamAttemptRepository.findByUser(userId)
  if (attempts.length === 0) return []

  const examIds = [...new Set(attempts.map((attempt) => attempt.liveExamId.toString()))]
  const examDocs = await Promise.all(examIds.map((id) => liveExamRepository.findById(id)))
  const examById = new Map<string, LiveExamDocument>()
  examIds.forEach((id, index) => {
    const exam = examDocs[index]
    if (exam) examById.set(id, exam)
  })

  const examCodeById = new Map<string, string>()
  const uniqueExamRefIds = [
    ...new Set([...examById.values()].map((exam) => exam.examId.toString())),
  ]
  const examRefDocs = await Promise.all(
    uniqueExamRefIds.map((id) => examRepository.findById(id)),
  )
  uniqueExamRefIds.forEach((id, index) =>
    examCodeById.set(id, examRefDocs[index]?.code ?? ''),
  )

  const now = new Date()
  const finalizedAttempts = await Promise.all(
    attempts.map(async (attempt) => {
      const exam = examById.get(attempt.liveExamId.toString())
      return exam ? ensureFinalized(attempt, exam) : attempt
    }),
  )

  return finalizedAttempts.map((attempt) => {
    const exam = examById.get(attempt.liveExamId.toString())
    const resultAvailable =
      attempt.status === 'submitted' && Boolean(exam) && isResultPublished(exam!, now)
    return {
      attemptId: attempt.id,
      liveExamId: attempt.liveExamId.toString(),
      examTitle: exam ? pickText(exam.title, lang) : '',
      examCategory: exam ? (examCodeById.get(exam.examId.toString()) ?? '') : '',
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      resultAvailable,
      score: resultAvailable ? attempt.score : null,
      totalMarks: resultAvailable && exam ? exam.totalMarks : null,
    }
  })
}
