import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import {
  completeTask as completeTaskMock,
  getTodayTasks as getTodayTasksMock,
} from '@/services/mock/dashboardMockService'
import type { CurrentAffairsPreviewItem } from '@/types/marketing'
import type {
  AchievementItem,
  AiMentorTip,
  ContinueLearningItem,
  DashboardNotification,
  DashboardSummary,
  DashboardTask,
  RankSummary,
  RecentActivityItem,
  RecommendedTopic,
  UpcomingExam,
  WeakSubject,
  WeeklyProgressPoint,
} from '@/types/dashboard'

/**
 * Domain calls for the Dashboard backend module (docs/Dashboard.md §21,
 * Step 44 §D) — backed by the real, combined `GET /dashboard`
 * (`backend/src/routes/dashboard.routes.ts`) for every section it covers.
 * `getTodayTasks`/`completeTask` stay mocked (Step 44 didn't build a real
 * Study Plan/task module — see their own comments below) per this step's
 * "don't remove unrelated mocks yet" instruction. Every widget component
 * keeps importing from this same facade unchanged.
 */

/** Mirrors `backend/src/services/dashboard.service.ts`'s `DashboardResponseDTO`. */
type DashboardApiResponse = {
  user: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
    role: string
    subscriptionTier: DashboardSummary['subscriptionTier']
    onboardingCompleted: boolean
  }
  selectedExam: {
    code: string
    name: string
    targetDate: string | null
    dailyStudyHoursBand: string | null
  } | null
  streak: { current: number; longest: number }
  xp: number
  xpGainedThisWeek: number
  coins: number
  level: number
  rank: {
    percentile: number
    rankEstimate: number
    cohortSize: number
    isSmallCohort: boolean
  }
  dailyGoal: { targetMinutes: number; completedMinutes: number }
  weeklyProgress: WeeklyProgressPoint[]
  continueLearning: ContinueLearningItem | null
  recommendedTopics: RecommendedTopic[]
  weakTopics: WeakSubject[]
  achievements: AchievementItem[]
  currentAffairsPreview: CurrentAffairsPreviewItem[]
  upcomingExams: UpcomingExam[]
  recentActivity: RecentActivityItem[]
}

/** De-dupes concurrent calls into a single `GET /dashboard` request — every
 * widget on the page mounts independently and calls one of the functions
 * below on the same render pass (docs/Dashboard.md §21's "shared fetch"
 * design), so without this they'd otherwise fire a dozen identical
 * requests. Mirrors `api/client.ts`'s `pendingRefresh` dedup pattern. */
let pendingFetch: Promise<DashboardApiResponse> | null = null

function fetchDashboard(): Promise<DashboardApiResponse> {
  pendingFetch ??= apiClient
    .get<{ data: DashboardApiResponse }>(endpoints.dashboard.root)
    .then((response) => response.data.data)
    .catch((error: unknown) => {
      pendingFetch = null
      throw error
    })
  return pendingFetch
}

/** Call after an action that changes server-side dashboard state (e.g.
 * completing Onboarding) so the next read isn't served a stale cache. */
export function invalidateDashboardCache(): void {
  pendingFetch = null
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const dashboard = await fetchDashboard()
  return {
    userName: dashboard.user.name,
    examGoal: {
      examCategory:
        (dashboard.selectedExam?.code as DashboardSummary['examGoal']['examCategory']) ??
        null,
      label: dashboard.selectedExam?.name ?? 'No exam selected',
      targetDate: dashboard.selectedExam?.targetDate ?? null,
    },
    dailyStudyGoalMinutes: dashboard.dailyGoal.targetMinutes,
    todayStudyMinutesDone: dashboard.dailyGoal.completedMinutes,
    streak: dashboard.streak,
    xp: dashboard.xp,
    xpGainedThisWeek: dashboard.xpGainedThisWeek,
    coins: dashboard.coins,
    level: dashboard.level,
    subscriptionTier: dashboard.user.subscriptionTier,
  }
}

export async function getRankSummary(): Promise<RankSummary> {
  const dashboard = await fetchDashboard()
  return dashboard.rank
}

/** Not part of Step 44's real `GET /dashboard` (no Study Plan module built
 * yet — docs/MASTER_ROADMAP.md's Learn/Practice-backed task generation is
 * still out of scope) — left mocked, matching this step's "don't remove
 * unrelated mocks yet" instruction. */
export async function getTodayTasks(): Promise<DashboardTask[]> {
  return getTodayTasksMock()
}

export async function completeTask(
  taskId: string,
): Promise<{ taskId: string; status: 'done' }> {
  return completeTaskMock(taskId)
}

export async function getWeeklyProgress(): Promise<WeeklyProgressPoint[]> {
  const dashboard = await fetchDashboard()
  return dashboard.weeklyProgress
}

export async function getContinueLearning(): Promise<ContinueLearningItem | null> {
  const dashboard = await fetchDashboard()
  return dashboard.continueLearning
}

export async function getRecommendedTopics(): Promise<RecommendedTopic[]> {
  const dashboard = await fetchDashboard()
  return dashboard.recommendedTopics
}

export async function getWeakSubjects(): Promise<WeakSubject[]> {
  const dashboard = await fetchDashboard()
  return dashboard.weakTopics
}

export async function getUpcomingExams(): Promise<UpcomingExam[]> {
  const dashboard = await fetchDashboard()
  return dashboard.upcomingExams
}

export async function getAiMentorTip(): Promise<AiMentorTip> {
  const dashboard = await fetchDashboard()
  if (dashboard.recommendedTopics.length === 0) {
    return {
      message:
        'Complete a few more practice sessions and we’ll start giving you personalized recommendations here.',
      supportingView: '',
    }
  }
  const [topRecommendation] = dashboard.recommendedTopics
  return {
    message: `Focus on ${topRecommendation.topic} this week — ${topRecommendation.reason.toLowerCase()}.`,
    supportingView: topRecommendation.subject,
  }
}

/** Not part of Step 44's real `GET /dashboard` contract (docs/Dashboard.md
 * §16 reads its own `GET /notifications`, a still-unbuilt Notifications
 * backend module — out of scope here) — an honest empty state rather than
 * a network call to an endpoint that doesn't cover this data. */
export async function getDashboardNotifications(): Promise<DashboardNotification[]> {
  return []
}

export async function getRecentActivity(): Promise<RecentActivityItem[]> {
  const dashboard = await fetchDashboard()
  return dashboard.recentActivity
}

export async function getAchievements(): Promise<AchievementItem[]> {
  const dashboard = await fetchDashboard()
  return dashboard.achievements
}

export async function getDashboardCurrentAffairs(): Promise<CurrentAffairsPreviewItem[]> {
  const dashboard = await fetchDashboard()
  return dashboard.currentAffairsPreview
}
