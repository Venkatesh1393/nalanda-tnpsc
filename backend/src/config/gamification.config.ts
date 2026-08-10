import type { BadgeCode } from '../constants/badges'

/**
 * Sprint 4 Step 61 — Gamification System. Single source of truth for every
 * XP/coin amount and achievement-unlock threshold, mirroring `plans.config.ts`
 * (Step 55) and `adaptivePractice.config.ts` (Step 60)'s "one file business
 * rules trace back to" pattern.
 *
 * XP/Coin amounts for practice completion are migrated unchanged from the
 * already-published mock values in `frontend/src/services/
 * practiceSessionService.ts` (`docs/Smart_Practice.md` §13-14's "small,
 * published, honestly-earned amounts") rather than inventing new numbers —
 * the same "real build reuses the already-approved mock number" precedent
 * `plans.config.ts`'s pricing migration set. Every other action's amount is
 * new (no prior doc/mock covered Lessons/Live Exams/Current Affairs) and
 * was set to the same order of magnitude, deliberately smaller than a full
 * practice session's total (~20-90 XP for a typical session) since none of
 * these are as effortful as answering a full set of practice questions —
 * per Smart_Practice.md's own "audit every XP/Coin rule against the real
 * study value test" guardrail, every amount here rewards a genuine
 * completion event, never a passive view.
 */
export const GAMIFICATION_CONFIG = {
  xp: {
    /** Per question answered (correct or not) in a completed practice session. */
    practicePerQuestionAnswered: 2,
    /** Additional bonus per correct answer. */
    practicePerCorrectBonus: 3,
    /** Flat bonus for completing (not abandoning) a practice session. */
    practiceSessionCompletionBonus: 20,
    /** Flat award the first time a subtopic transitions to `completed`. */
    lessonCompletion: 15,
    /** Flat award for finishing (submitting) a Weekly Live Exam attempt. */
    liveExamParticipation: 30,
    /** Flat award the first time a student reads a given Current Affairs article. */
    currentAffairsReading: 5,
  },
  coins: {
    practicePerCorrectAnswer: 1,
    practiceSessionCompletionBonus: 5,
    lessonCompletion: 3,
    liveExamParticipation: 8,
    currentAffairsReading: 1,
  },
  /** Level `n` is reached once cumulative XP crosses `baseXpPerLevel * n^2`
   * (level 1: 0-99 XP, level 2: 100-399, level 3: 400-899, ...) — a standard
   * accelerating-curve so early levels come quickly (motivating a new user)
   * while later levels take meaningfully longer (staying meaningful for a
   * long-tenured one). Never stored — always computed live from `Profile.xp`,
   * the same "derived value, never a duplicated stored copy" rule
   * `learn.service.ts`'s `completionPercent` and `adaptivePractice`'s
   * candidate scores already established. */
  level: {
    baseXpPerLevel: 100,
    maxLevel: 100,
  },
  achievements: {
    questionMilestones: {
      hundred: 100,
      fiveHundred: 500,
      thousand: 1000,
    },
    streakMilestones: {
      sevenDay: 7,
      thirtyDay: 30,
    },
    /** A single-question "100% accuracy" session would trivially game
     * Perfect Score — require a genuinely full session, matching
     * `analytics.service.ts`'s `MIN_ATTEMPTS_FOR_CLASSIFICATION` precedent
     * for "don't classify/reward off too small a sample." */
    perfectScoreMinQuestions: 5,
    /** Real, measurable "power learner" signal — completing this many
     * subtopics within one calendar day (UTC), computed from real
     * `LearningProgress.completedAt` timestamps. */
    fastLearnerLessonsPerDay: 5,
  },
} as const

export interface AchievementDefinition {
  code: BadgeCode
  title: string
  description: string
}

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  {
    code: 'first-practice',
    title: 'First Practice',
    description: 'Completed your first practice session.',
  },
  {
    code: 'hundred-questions',
    title: '100 Questions',
    description: 'Answered 100 questions across all practice sessions.',
  },
  {
    code: 'five-hundred-questions',
    title: '500 Questions',
    description: 'Answered 500 questions across all practice sessions.',
  },
  {
    code: 'thousand-questions',
    title: '1000 Questions',
    description: 'Answered 1000 questions across all practice sessions.',
  },
  {
    code: 'seven-day-streak',
    title: '7-Day Streak',
    description: 'Studied 7 days in a row.',
  },
  {
    code: 'thirty-day-streak',
    title: '30-Day Streak',
    description: 'Studied 30 days in a row.',
  },
  {
    code: 'perfect-score',
    title: 'Perfect Score',
    description: 'Scored 100% accuracy in a practice session.',
  },
  {
    code: 'fast-learner',
    title: 'Fast Learner',
    description: 'Completed 5 lessons in a single day.',
  },
] as const
