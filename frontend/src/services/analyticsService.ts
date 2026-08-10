import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  AnalyticsSummary,
  DifficultyAccuracyPoint,
  GoalCompletionData,
  MonthlyProgressPoint,
  PracticeHistoryPoint,
  RankPredictionData,
  SpeedAnalysisPoint,
  SubjectAccuracyPoint,
  TopicAccuracyPoint,
  WeeklyStudyTimePoint,
} from '@/types/analytics'

/**
 * Domain calls for the real Individual Student Analytics backend (Sprint 3
 * Step 47, `backend/src/routes/analytics.routes.ts`) — every function below
 * now calls a live endpoint computed from the student's actual
 * `QuestionAttempt`/`PracticeSession`/`LearningProgress` records, replacing
 * `services/mock/analyticsMockService.ts`. This is the same stable facade
 * every chart component already imports from — no chart or type shape
 * changed, only what's behind this file.
 */

interface ApiEnvelope<T> {
  data: T
}

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get<ApiEnvelope<T>>(url, { params })
  return response.data.data
}

interface OverviewApiResponse {
  hasActivity: boolean
  totalQuestionsAttempted: number
  accuracyPercent: number
  percentile: number
  lastUpdatedAt: string
  currentStreakDays: number
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const overview = await get<OverviewApiResponse>(endpoints.analytics.overview)
  return {
    overallPercentile: overview.percentile,
    overallAccuracy: overview.accuracyPercent,
    totalQuestionsAttempted: overview.totalQuestionsAttempted,
    currentStreak: overview.currentStreakDays,
    lastUpdatedAt: overview.lastUpdatedAt,
    hasActivity: overview.hasActivity,
  }
}

export async function getSubjectAccuracy(): Promise<SubjectAccuracyPoint[]> {
  return get<SubjectAccuracyPoint[]>(endpoints.analytics.subjectAccuracy)
}

export async function getWeeklyStudyTime(): Promise<WeeklyStudyTimePoint[]> {
  return get<WeeklyStudyTimePoint[]>(endpoints.analytics.weeklyStudyTime)
}

export async function getMonthlyProgress(): Promise<MonthlyProgressPoint[]> {
  return get<MonthlyProgressPoint[]>(endpoints.analytics.monthlyProgress)
}

export async function getWeakAreas(): Promise<TopicAccuracyPoint[]> {
  return get<TopicAccuracyPoint[]>(endpoints.analytics.weakAreas, { limit: 5 })
}

export async function getStrongAreas(): Promise<TopicAccuracyPoint[]> {
  return get<TopicAccuracyPoint[]>(endpoints.analytics.strongAreas, { limit: 5 })
}

export async function getPracticeHistory(): Promise<PracticeHistoryPoint[]> {
  return get<PracticeHistoryPoint[]>(endpoints.analytics.practiceHistory, { limit: 8 })
}

export async function getSpeedAnalysis(): Promise<SpeedAnalysisPoint[]> {
  return get<SpeedAnalysisPoint[]>(endpoints.analytics.speedAnalysis)
}

export async function getRankPrediction(): Promise<RankPredictionData> {
  return get<RankPredictionData>(endpoints.analytics.rank)
}

export async function getGoalCompletion(): Promise<GoalCompletionData> {
  return get<GoalCompletionData>(endpoints.analytics.goalCompletion)
}

export async function getDifficultyAnalytics(): Promise<DifficultyAccuracyPoint[]> {
  const rows = await get<
    { difficulty: string; attempted: number; correct: number; accuracyPercent: number }[]
  >(endpoints.analytics.difficulty)
  return rows.map((row) => ({
    difficulty: row.difficulty,
    attempted: row.attempted,
    accuracy: Math.round(row.accuracyPercent),
  }))
}
