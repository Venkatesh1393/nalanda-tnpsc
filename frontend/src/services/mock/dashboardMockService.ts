import { COHORT_SIZE, MY_POSITION } from '@/services/mock/leaderboardMockService'
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
 * Mock implementation of the Dashboard backend module (docs/Dashboard.md
 * §21, docs/API.md §2/§9/§13) — no backend exists yet (Sprint 3), so every
 * function here simulates network latency and returns realistic,
 * hand-authored TNPSC mock data instead of calling `apiClient`.
 * `services/dashboardService.ts` is the stable facade every widget imports
 * from; only that file's function bodies need to change once a real
 * backend exists — no widget component needs to change either way.
 * `getDashboardCurrentAffairs` is the one exception worth calling out:
 * `services/currentAffairsService.ts` already has its own
 * `getCurrentAffairsPreview` for this exact endpoint (reused by the Landing
 * Page) — this file adds a mock-only sibling with the identical
 * `CurrentAffairsPreviewItem` shape so the Dashboard widget stays decoupled
 * from that module's own facade/mock split.
 */

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return delay(
    {
      userName: 'Kalaivani',
      examGoal: { examCategory: 'group-4', label: 'Group 4', targetDate: '2026-11-01' },
      dailyStudyGoalMinutes: 60,
      todayStudyMinutesDone: 32,
      streak: { current: 12, longest: 21 },
      xp: 4230,
      xpGainedThisWeek: 180,
      coins: 340,
      level: 7,
      subscriptionTier: 'free',
    },
    500,
  )
}

/** Derived from `services/mock/leaderboardMockService.ts`'s `MY_POSITION`/
 * `COHORT_SIZE` — the single source of truth for these numbers across
 * Dashboard/Analytics, rather than each mock independently hardcoding
 * "percentile 82, rank #412 of 2,280" with just a comment to keep them in
 * sync. */
export async function getRankSummary(): Promise<RankSummary> {
  return delay(
    {
      percentile: MY_POSITION.percentile,
      rankEstimate: MY_POSITION.rank,
      cohortSize: COHORT_SIZE,
      isSmallCohort: false,
    },
    550,
  )
}

export async function getTodayTasks(): Promise<DashboardTask[]> {
  return delay(
    [
      {
        id: 'task-1',
        title: 'Watch: Sangam Age overview',
        type: 'video',
        subject: 'History',
      },
      {
        id: 'task-2',
        title: 'Read: Fundamental Rights one-liners',
        type: 'notes',
        subject: 'Polity',
      },
      {
        id: 'task-3',
        title: '10-question Aptitude quiz',
        type: 'quiz',
        subject: 'Aptitude',
      },
      {
        id: 'task-4',
        title: 'Revise 3 bookmarked questions',
        type: 'revision',
        subject: 'General Science',
      },
    ],
    450,
  )
}

export async function completeTask(
  taskId: string,
): Promise<{ taskId: string; status: 'done' }> {
  return delay({ taskId, status: 'done' }, 300)
}

export async function getWeeklyProgress(): Promise<WeeklyProgressPoint[]> {
  return delay(
    [
      { label: 'Mon', value: 45 },
      { label: 'Tue', value: 60 },
      { label: 'Wed', value: 0 },
      { label: 'Thu', value: 35 },
      { label: 'Fri', value: 70 },
      { label: 'Sat', value: 90 },
      { label: 'Sun', value: 32 },
    ],
    600,
  )
}

export async function getContinueLearning(): Promise<ContinueLearningItem | null> {
  return delay(
    {
      subject: 'General Science',
      topic: 'Physics',
      subtopic: "Newton's Laws of Motion",
      progressPercent: 60,
    },
    500,
  )
}

export async function getRecommendedTopics(): Promise<RecommendedTopic[]> {
  return delay(
    [
      {
        id: 'rec-1',
        subject: 'Tamil Nadu History',
        topic: 'Sangam Age',
        reason: 'Frequently tested in Group 4 Prelims',
        subjectId: 'tamil-nadu-history',
        topicId: 'sangam-age',
        suggestedDifficulty: 'medium',
        suggestedQuestionCount: 10,
      },
      {
        id: 'rec-2',
        subject: 'Indian Polity',
        topic: 'Fundamental Rights',
        reason: 'Builds on what you studied yesterday',
        subjectId: 'indian-polity',
        topicId: 'fundamental-rights',
        suggestedDifficulty: 'medium',
        suggestedQuestionCount: 10,
      },
      {
        id: 'rec-3',
        subject: 'Aptitude',
        topic: 'Time and Work',
        reason: 'A common gap for aspirants at your stage',
        subjectId: 'aptitude',
        topicId: 'time-and-work',
        suggestedDifficulty: 'easy',
        suggestedQuestionCount: 5,
      },
    ],
    650,
  )
}

export async function getWeakSubjects(): Promise<WeakSubject[]> {
  return delay(
    [
      { subject: 'Aptitude', accuracy: 48, attemptCount: 32 },
      { subject: 'General English', accuracy: 55, attemptCount: 21 },
      { subject: 'Current Affairs', accuracy: 61, attemptCount: 18 },
    ],
    600,
  )
}

export async function getUpcomingExams(): Promise<UpcomingExam[]> {
  const now = Date.now()
  return delay(
    [
      {
        id: 'live-1',
        title: 'Sunday National Mock',
        examCategory: 'group-4',
        scheduledStartAt: new Date(now + 1000 * 60 * 60 * 30).toISOString(),
      },
      {
        id: 'live-2',
        title: 'Weekly Current Affairs Quiz',
        examCategory: 'group-4',
        scheduledStartAt: new Date(now + 1000 * 60 * 60 * 96).toISOString(),
      },
    ],
    550,
  )
}

export async function getAiMentorTip(): Promise<AiMentorTip> {
  return delay(
    {
      message:
        'Focus on Aptitude this week — your accuracy there is 20 points below your average, and it appears in every TNPSC paper.',
      supportingView: 'Aptitude',
    },
    700,
  )
}

export async function getDashboardNotifications(): Promise<DashboardNotification[]> {
  const now = Date.now()
  return delay(
    [
      {
        id: 'notif-1',
        title: 'Your weekly mock test results are ready',
        isRead: false,
        createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
      },
      {
        id: 'notif-2',
        title: 'TNPSC Group 4 hall ticket released',
        isRead: false,
        createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      },
      {
        id: 'notif-3',
        title: 'Someone replied to your doubt in Community',
        isRead: true,
        createdAt: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
      },
    ],
    450,
  )
}

export async function getRecentActivity(): Promise<RecentActivityItem[]> {
  const now = Date.now()
  return delay(
    [
      {
        id: 'activity-1',
        label: 'Completed Group 4 Mock Test #3',
        timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: 'activity-2',
        label: "Bookmarked 'Sangam Age' notes",
        timestamp: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
      },
      {
        id: 'activity-3',
        label: 'Earned the "7-Day Streak" achievement',
        timestamp: new Date(now - 1000 * 60 * 60 * 50).toISOString(),
      },
    ],
    500,
  )
}

export async function getAchievements(): Promise<AchievementItem[]> {
  return delay(
    [
      {
        id: 'badge-1',
        title: '7-Day Streak',
        description: 'Studied 7 days in a row',
        earned: true,
      },
      {
        id: 'badge-2',
        title: 'First Mock Completed',
        description: 'Finished your first full mock test',
        earned: true,
      },
      {
        id: 'badge-3',
        title: '100 Questions Club',
        description: 'Completed a full 100 Questions set',
        earned: true,
      },
      {
        id: 'badge-4',
        title: 'PYQ Completionist',
        description: 'Solved a full year of previous-year questions',
        earned: false,
      },
      {
        id: 'badge-5',
        title: '30-Day Streak',
        description: 'Studied 30 days in a row',
        earned: false,
      },
      {
        id: 'badge-6',
        title: 'Comeback',
        description: 'Returned to practice after a break',
        earned: false,
      },
    ],
    500,
  )
}

export async function getDashboardCurrentAffairs(): Promise<CurrentAffairsPreviewItem[]> {
  const today = new Date().toISOString()
  return delay(
    [
      {
        id: 'ca-1',
        date: today,
        title: 'TN government announces new skill-development scheme',
        excerpt:
          'A new initiative aimed at rural youth employment — relevant for General Studies.',
        tags: ['Tamil Nadu', 'Government Schemes'],
      },
      {
        id: 'ca-2',
        date: today,
        title: 'RBI holds repo rate steady in latest policy review',
        excerpt: 'Key takeaways for Indian Economy sections across TNPSC papers.',
        tags: ['Economy'],
      },
    ],
    500,
  )
}
