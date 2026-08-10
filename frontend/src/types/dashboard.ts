import type { ExamCategoryId, SubscriptionTier } from '@/constants/exam'

/**
 * Dashboard content DTOs (docs/Dashboard.md, docs/API.md §2/§9/§13) — one
 * type per shared fetch (docs/Dashboard.md §21), consumed by whichever
 * widgets read that fetch.
 */

export type DashboardSummary = {
  userName: string
  examGoal: {
    examCategory: ExamCategoryId | null
    label: string
    targetDate: string | null
  }
  dailyStudyGoalMinutes: number
  todayStudyMinutesDone: number
  streak: { current: number; longest: number }
  xp: number
  xpGainedThisWeek: number
  coins: number
  /** Real as of Sprint 4 Step 61 (Gamification System) — always computed
   * live from `xp` server-side, never a stored duplicate. */
  level: number
  subscriptionTier: SubscriptionTier
}

export type RankSummary = {
  percentile: number
  rankEstimate: number
  cohortSize: number
  /** Below this, docs/Dashboard.md §7 shows a small-cohort disclaimer
   * instead of the normal rank caption. */
  isSmallCohort: boolean
}

export type DashboardTask = {
  id: string
  title: string
  type: 'video' | 'notes' | 'quiz' | 'revision'
  subject: string
}

export type WeeklyProgressPoint = {
  label: string
  value: number
}

export type ContinueLearningItem = {
  subject: string
  topic: string
  subtopic: string
  progressPercent: number
}

/** Backed by the real Adaptive Practice Engine (Sprint 4 Step 60,
 * `backend/src/services/adaptivePractice.service.ts`) — deterministic,
 * rule-based, never AI. `subjectId`/`topicId` are real Subject/Topic slugs
 * (same id shape every other Learn/Practice deep link uses), letting a
 * "Practice this topic" action jump straight into Smart Practice's Topic
 * Quiz config pre-filled with the engine's own suggested difficulty/count. */
export type RecommendedTopic = {
  id: string
  subject: string
  topic: string
  reason: string
  subjectId: string
  topicId: string
  suggestedDifficulty: 'easy' | 'medium' | 'hard'
  suggestedQuestionCount: number
}

export type WeakSubject = {
  subject: string
  accuracy: number
  attemptCount: number
}

export type UpcomingExam = {
  id: string
  title: string
  examCategory: ExamCategoryId
  scheduledStartAt: string
}

export type AiMentorTip = {
  message: string
  supportingView: string
}

export type DashboardNotification = {
  id: string
  title: string
  isRead: boolean
  createdAt: string
}

export type RecentActivityItem = {
  id: string
  label: string
  timestamp: string
}

export type AchievementItem = {
  id: string
  title: string
  description: string
  earned: boolean
}
