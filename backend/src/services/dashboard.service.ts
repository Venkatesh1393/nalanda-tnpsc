import type { StudyHoursBand } from '../constants/user'
import type { ProfileDocument } from '../models/Profile.model'
import type { UserDocument } from '../models/User.model'
import * as examRepository from '../repositories/exam.repository'
import * as liveExamRepository from '../repositories/liveExam.repository'
import * as profileRepository from '../repositories/profile.repository'
import * as userRepository from '../repositories/user.repository'
import { ApiError } from '../utils/ApiError'
import { getRecommendations } from './adaptivePractice.service'
import { getAchievementsCatalog, getSummary } from './gamification.service'
import { pickText, resolveExamCode, type DisplayLanguage } from './learn.service'

const STUDY_HOURS_BAND_MINUTES: Record<StudyHoursBand, number> = {
  'under-1': 45,
  '1-2': 90,
  '2-4': 180,
  '4-plus': 300,
}

export interface DashboardResponseDTO {
  user: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
    role: UserDocument['role']
    subscriptionTier: UserDocument['subscriptionTier']
    onboardingCompleted: boolean
  }
  selectedExam: {
    code: string
    name: string
    targetDate: string | null
    dailyStudyHoursBand: StudyHoursBand | null
  } | null
  streak: { current: number; longest: number }
  /** Real as of Sprint 4 Step 61 (Gamification System) —
   * `services/gamification.service.ts`'s `getSummary`/`getLevelInfo`.
   * `level` is always computed live from `xp`, never a stored duplicate. */
  xp: number
  xpGainedThisWeek: number
  coins: number
  level: number
  /** `null` only while the summary is loading on the client — once resolved
   * this is always an object; a genuinely new/low-volume user gets
   * `isSmallCohort: true` with zeroed numbers rather than a fabricated rank
   * (Step 44's explicit "do not invent analytics or rank" instruction). No
   * `StudentAnalytics`/`Leaderboard` aggregation job exists yet, so this is
   * always the honest zero-state today, not a bug. */
  rank: {
    percentile: number
    rankEstimate: number
    cohortSize: number
    isSmallCohort: boolean
  }
  dailyGoal: { targetMinutes: number; completedMinutes: number }
  weeklyProgress: { label: string; value: number }[]
  continueLearning: null
  /** Real as of Sprint 4 Step 60 (Adaptive Practice Engine) — the engine's
   * top-ranked candidates, deterministic and rule-based (never AI). `id` is
   * a stable `subjectId:topicId` slug pair a client can split to deep-link
   * straight into Smart Practice's Topic Quiz config with the engine's own
   * suggested difficulty/question count pre-filled. */
  recommendedTopics: {
    id: string
    subject: string
    topic: string
    reason: string
    subjectId: string
    topicId: string
    suggestedDifficulty: string
    suggestedQuestionCount: number
  }[]
  weakTopics: { subject: string; accuracy: number; attemptCount: number }[]
  /** Real as of Sprint 4 Step 61 — the full 8-badge catalog with each
   * entry's real earned/locked state (never trimmed to earned-only, so the
   * Achievements grid can show locked badges as aspiration per
   * `docs/Dashboard.md` §18). */
  achievements: { id: string; title: string; description: string; earned: boolean }[]
  currentAffairsPreview: never[]
  /** Real as of Step 48 (Live Exams) — top 3 upcoming, exam-goal-filtered
   * when the user has one. `title` respects the caller's `?lang=`, same as
   * every other real module. */
  upcomingExams: {
    id: string
    title: string
    examCategory: string
    scheduledStartAt: string
  }[]
  recentActivity: never[]
}

async function loadUserAndProfile(
  userId: string,
): Promise<{ user: UserDocument; profile: ProfileDocument }> {
  const [user, profile] = await Promise.all([
    userRepository.findById(userId),
    profileRepository.findByUserId(userId),
  ])
  if (!user) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.')
  }
  if (!profile) {
    throw ApiError.internal('Profile record is missing for this account.')
  }
  return { user, profile }
}

/**
 * `GET /dashboard` (Step 44 §D) — one combined response covering every
 * section the existing Dashboard widgets read (docs/Dashboard.md §21).
 * `user`/`selectedExam`/`streak`/`dailyGoal`/`weakTopics`/`upcomingExams`/
 * `recommendedTopics`/`xp`/`coins`/`xpGainedThisWeek`/`level`/`achievements`
 * all have a real data source today (`recommendedTopics` since Step 60;
 * `xp`/`coins`/`streak`/`level`/`achievements` since Step 61, backed by
 * `gamification.service.ts` — `streak` was declared on `Profile` since
 * Step 44 but never actually written until Step 61 activated it); everything
 * else (`rank`, `weeklyProgress`, `continueLearning`, `currentAffairsPreview`,
 * `recentActivity`) has no backing module wired into this endpoint yet —
 * those are returned as honest zero/empty values, never fabricated numbers,
 * per this step's explicit instruction.
 */
export async function getDashboard(
  userId: string,
  lang: DisplayLanguage,
): Promise<DashboardResponseDTO> {
  const { user, profile } = await loadUserAndProfile(userId)

  const primaryGoal =
    profile.examGoals.find((goal) => goal.isPrimary) ?? profile.examGoals[0] ?? null
  const exam = primaryGoal ? await examRepository.findById(primaryGoal.examId) : null

  const studyHoursBand =
    primaryGoal?.dailyStudyHoursBand ?? profile.onboarding.studyHoursBand
  const targetMinutes = studyHoursBand ? STUDY_HOURS_BAND_MINUTES[studyHoursBand] : 0

  const weakTopics = profile.onboarding.weakSubjects.map((subject) => ({
    subject,
    // Self-reported during Onboarding, not a computed score — attemptCount
    // stays 0 so the existing widget's own "not enough data yet" threshold
    // (5 attempts) renders honestly instead of a fabricated accuracy %.
    accuracy: 0,
    attemptCount: 0,
  }))

  const [upcomingLiveExams, recommendations, gamificationSummary, achievements] =
    await Promise.all([
      liveExamRepository.findByTab({
        tab: 'upcoming',
        now: new Date(),
        examId: primaryGoal?.examId,
      }),
      getRecommendations(userId, lang),
      getSummary(userId),
      getAchievementsCatalog(userId),
    ])
  const upcomingExams = await Promise.all(
    upcomingLiveExams.slice(0, 3).map(async (liveExam) => ({
      id: liveExam.id,
      title: pickText(liveExam.title, lang),
      examCategory: await resolveExamCode(liveExam.examId),
      scheduledStartAt: liveExam.scheduledStartAt.toISOString(),
    })),
  )

  return {
    user: {
      id: user.id,
      name: profile.name,
      email: user.email,
      avatarUrl: profile.photoUrl ?? null,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      onboardingCompleted: profile.onboarding.completed,
    },
    selectedExam: exam
      ? {
          code: exam.code,
          name: pickText(exam.name, lang),
          targetDate: primaryGoal?.targetDate?.toISOString() ?? null,
          dailyStudyHoursBand: studyHoursBand ?? null,
        }
      : null,
    streak: gamificationSummary.streak,
    xp: gamificationSummary.xp,
    xpGainedThisWeek: gamificationSummary.xpGainedThisWeek,
    coins: gamificationSummary.coins,
    level: gamificationSummary.level.level,
    rank: { percentile: 0, rankEstimate: 0, cohortSize: 0, isSmallCohort: true },
    dailyGoal: { targetMinutes, completedMinutes: 0 },
    weeklyProgress: [],
    continueLearning: null,
    recommendedTopics: recommendations.alternatives.map((topic) => ({
      id: `${topic.subjectId}:${topic.topicId}`,
      subject: topic.subjectName,
      topic: topic.topicName,
      reason: topic.reason,
      subjectId: topic.subjectId,
      topicId: topic.topicId,
      suggestedDifficulty: topic.suggestedDifficulty,
      suggestedQuestionCount: topic.suggestedQuestionCount,
    })),
    weakTopics,
    achievements: achievements.map((badge) => ({
      id: badge.code,
      title: badge.title,
      description: badge.description,
      earned: badge.earned,
    })),
    currentAffairsPreview: [],
    upcomingExams,
    recentActivity: [],
  }
}
