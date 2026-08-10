/**
 * Weekly Live Exam DTOs (Step 48, `backend/src/services/liveExam.service.ts`).
 * A student never receives `correctOptionId`/`explanation` on any question
 * until the exam's result is published — mirrors `types/practice.ts`'s
 * answer-leakage discipline, but stricter: unlike Practice's Topic Quiz,
 * there is no mid-exam reveal at all (`docs/Smart_Practice.md` §2/§11's
 * hard-timer, non-adaptive, faithful-exam-simulation boundary).
 */

export type LiveExamStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled'

export type LiveExamTab = 'upcoming' | 'live' | 'completed'

export type LiveExamEffectiveStatus = 'upcoming' | 'live' | 'completed' | 'cancelled'

export type LiveExamAttemptStatus = 'in-progress' | 'submitted'

export type LiveExamListItem = {
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
  /** `null` — the signed-in student has never joined this exam. */
  myAttemptStatus: LiveExamAttemptStatus | null
}

export type LiveExamDetail = LiveExamListItem & {
  instructions: string[]
  negativeMarking: { enabled: boolean; marksPerWrongAnswer: number }
  marksPerQuestion: number
  resultPublication: { mode: 'immediate' | 'scheduled'; publishAt: string | null }
  /** Server clock at response time — the countdown/eligibility source of
   * truth; the client should sync against this, never its own `Date.now()`
   * alone (Step 48's "server time is authoritative" rule). */
  serverTime: string
}

export type LiveExamQuestionOption = { id: string; text: string }

export type LiveExamQuestion = {
  id: string
  questionText: string
  questionImageUrl: string | null
  options: LiveExamQuestionOption[]
  difficulty: 'easy' | 'medium' | 'hard'
  hasAiExplanation: boolean
}

export type LiveExamAnswer = {
  questionId: string
  selectedOptionId: string | null
  markedForReview: boolean
}

export type LiveExamAttemptState = {
  attemptId: string
  liveExamId: string
  status: LiveExamAttemptStatus
  startedAt: string
  /** This student's personal countdown target — already capped against the
   * cohort's `scheduledEndAt` server-side. */
  deadlineAt: string
  serverTime: string
  questions: LiveExamQuestion[]
  answers: LiveExamAnswer[]
}

export type LiveExamResultReviewQuestion = {
  questionId: string
  questionText: string
  options: LiveExamQuestionOption[]
  selectedOptionId: string | null
  correctOptionId: string
  isCorrect: boolean
  explanation: string
}

export type LiveExamResult = {
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
    questions: LiveExamResultReviewQuestion[]
  }
}

export type MyLiveExamAttempt = {
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
