import type { Types } from 'mongoose'

import { ACHIEVEMENT_CATALOG, GAMIFICATION_CONFIG } from '../config/gamification.config'
import type { AchievementDefinition } from '../config/gamification.config'
import type { BadgeCode } from '../constants/badges'
import type { XpTransactionReason } from '../models/XpTransaction.model'
import * as achievementRepository from '../repositories/achievement.repository'
import * as analyticsRepository from '../repositories/analytics.repository'
import * as learningProgressRepository from '../repositories/learningProgress.repository'
import * as practiceSessionRepository from '../repositories/practiceSession.repository'
import * as profileRepository from '../repositories/profile.repository'
import * as xpTransactionRepository from '../repositories/xpTransaction.repository'
import { ApiError } from '../utils/ApiError'
import { notifyAchievementEarned } from './notification.service'

/**
 * Sprint 4 Step 61 — Gamification System. The single chokepoint every
 * XP/coin-earning action in the platform calls through (`awardXp`) — never
 * bypassed by a direct `Profile.xp`/`Profile.coins` write elsewhere, the
 * same "one real chokepoint" discipline `entitlement.service.ts` (Step 55)
 * established for premium feature checks.
 *
 * XP/Level/Streak/Achievements are all computed from — and persisted to —
 * real MongoDB state: `Profile.xp`/`Profile.coins`/`Profile.streak` hold the
 * current running totals, `XpTransaction` is the append-only audit ledger
 * behind them, `Achievement` holds real earned-badge instances. `Level` is
 * the one derived value never stored (computed live from `Profile.xp`,
 * matching every other "never a duplicated stored copy" precedent in this
 * codebase). Leaderboard (Weekly/Monthly/Overall) already exists and is
 * already real (`services/leaderboard.service.ts`, live-aggregated from
 * `PracticeSession` — unrelated to this file, not touched here).
 */

const DAY_MS = 24 * 60 * 60 * 1000

function dateKeyUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// ---- Level system — a standard accelerating XP curve, never stored ----

export interface LevelInfoDTO {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
  progressPercent: number
  isMaxLevel: boolean
}

/** Level `n` starts once cumulative XP reaches `baseXpPerLevel * (n-1)^2` —
 * see `gamification.config.ts`'s header comment for the full rationale. */
export function getLevelInfo(xp: number): LevelInfoDTO {
  const { baseXpPerLevel, maxLevel } = GAMIFICATION_CONFIG.level
  const thresholdFor = (level: number) => baseXpPerLevel * (level - 1) ** 2

  const rawLevel = Math.floor(Math.sqrt(xp / baseXpPerLevel)) + 1
  const level = Math.min(maxLevel, Math.max(1, rawLevel))
  const isMaxLevel = level >= maxLevel

  const currentLevelStart = thresholdFor(level)
  const nextLevelStart = isMaxLevel ? currentLevelStart : thresholdFor(level + 1)
  const xpIntoLevel = xp - currentLevelStart
  const xpSpan = nextLevelStart - currentLevelStart

  return {
    level,
    xpIntoLevel,
    xpForNextLevel: isMaxLevel ? 0 : nextLevelStart - xp,
    progressPercent: isMaxLevel ? 100 : Math.round((xpIntoLevel / xpSpan) * 100),
    isMaxLevel,
  }
}

// ---- Daily streak — activity-based, updated at most once per calendar day ----

interface StreakState {
  current: number
  longest: number
  lastActiveDate: Date
}

/** Only changes state on a genuinely new UTC calendar day — a second (or
 * hundredth) XP-earning action on the same day is a no-op here, so calling
 * `awardXp` many times in one day never inflates the streak. A gap of more
 * than one day resets `current` to 1 rather than 0 (today itself counts). */
function computeStreak(
  current: number,
  longest: number,
  lastActiveDate: Date | undefined,
  now: Date,
): StreakState & { changed: boolean } {
  const todayKey = dateKeyUtc(now)
  if (lastActiveDate && dateKeyUtc(lastActiveDate) === todayKey) {
    return { current, longest, lastActiveDate, changed: false }
  }
  const yesterdayKey = dateKeyUtc(new Date(now.getTime() - DAY_MS))
  const isConsecutive = lastActiveDate && dateKeyUtc(lastActiveDate) === yesterdayKey
  const nextCurrent = isConsecutive ? current + 1 : 1
  return {
    current: nextCurrent,
    longest: Math.max(longest, nextCurrent),
    lastActiveDate: now,
    changed: true,
  }
}

// ---- Achievements ----

export interface AchievementCatalogEntryDTO {
  code: BadgeCode
  title: string
  description: string
  earned: boolean
  earnedAt: string | null
}

const QUESTION_MILESTONE_CODES: BadgeCode[] = [
  'first-practice',
  'hundred-questions',
  'five-hundred-questions',
  'thousand-questions',
]

async function tryUnlock(
  userId: string,
  def: AchievementDefinition,
  eligible: boolean,
  unlocked: AchievementDefinition[],
): Promise<void> {
  if (!eligible) return
  const awarded = await achievementRepository.awardIfNew(userId, def.code)
  if (awarded) {
    unlocked.push(def)
    await notifyAchievementEarned(userId, def.code, def.title)
  }
}

/** Evaluates every not-yet-earned achievement against real current data and
 * awards any that now qualify — called at the end of every `awardXp` (so an
 * achievement unlocks the moment its real condition becomes true, whichever
 * action triggered it), idempotent via `Achievement`'s unique index. */
async function checkAndUnlockAchievements(
  userId: string,
  streakCurrent: number,
): Promise<AchievementDefinition[]> {
  const earnedCodes = await achievementRepository.findEarnedCodes(userId)
  const missing = ACHIEVEMENT_CATALOG.filter((def) => !earnedCodes.has(def.code))
  if (missing.length === 0) return []

  const thresholds = GAMIFICATION_CONFIG.achievements
  const unlocked: AchievementDefinition[] = []

  const needsQuestionTotals = missing.some((def) =>
    QUESTION_MILESTONE_CODES.includes(def.code),
  )
  const totals = needsQuestionTotals
    ? await analyticsRepository.getUserAttemptTotals(userId)
    : null

  for (const def of missing) {
    switch (def.code) {
      case 'first-practice': {
        const count = await practiceSessionRepository.countSubmittedByUser(userId)
        await tryUnlock(userId, def, count >= 1, unlocked)
        break
      }
      case 'hundred-questions':
        await tryUnlock(
          userId,
          def,
          (totals?.attempted ?? 0) >= thresholds.questionMilestones.hundred,
          unlocked,
        )
        break
      case 'five-hundred-questions':
        await tryUnlock(
          userId,
          def,
          (totals?.attempted ?? 0) >= thresholds.questionMilestones.fiveHundred,
          unlocked,
        )
        break
      case 'thousand-questions':
        await tryUnlock(
          userId,
          def,
          (totals?.attempted ?? 0) >= thresholds.questionMilestones.thousand,
          unlocked,
        )
        break
      case 'seven-day-streak':
        await tryUnlock(
          userId,
          def,
          streakCurrent >= thresholds.streakMilestones.sevenDay,
          unlocked,
        )
        break
      case 'thirty-day-streak':
        await tryUnlock(
          userId,
          def,
          streakCurrent >= thresholds.streakMilestones.thirtyDay,
          unlocked,
        )
        break
      case 'perfect-score': {
        const has = await practiceSessionRepository.hasPerfectScore(
          userId,
          thresholds.perfectScoreMinQuestions,
        )
        await tryUnlock(userId, def, has, unlocked)
        break
      }
      case 'fast-learner': {
        const has = await learningProgressRepository.hasCompletedNInOneDay(
          userId,
          thresholds.fastLearnerLessonsPerDay,
        )
        await tryUnlock(userId, def, has, unlocked)
        break
      }
    }
  }

  return unlocked
}

export async function getAchievementsCatalog(
  userId: string,
): Promise<AchievementCatalogEntryDTO[]> {
  const earned = await achievementRepository.findByUser(userId)
  const earnedMap = new Map(earned.map((doc) => [doc.badgeCode, doc.earnedAt]))
  return ACHIEVEMENT_CATALOG.map((def) => {
    const earnedAt = earnedMap.get(def.code)
    return {
      code: def.code,
      title: def.title,
      description: def.description,
      earned: earnedAt !== undefined,
      earnedAt: earnedAt ? earnedAt.toISOString() : null,
    }
  })
}

// ---- The award chokepoint ----

export interface AwardXpInput {
  reason: XpTransactionReason
  xpAmount: number
  coinsAmount: number
  refId?: Types.ObjectId | string
}

export interface AwardXpResultDTO {
  xpAwarded: number
  coinsAwarded: number
  totalXp: number
  totalCoins: number
  level: LevelInfoDTO
  streak: { current: number; longest: number }
  newlyUnlockedAchievements: AchievementCatalogEntryDTO[]
}

/**
 * Every real completion event (Practice, Lesson, Live Exam, Current
 * Affairs) calls this once — never awards XP for a passive view, only a
 * genuine completion (`docs/Smart_Practice.md` §13's "real study value"
 * guardrail). Increments the running `xp`/`coins` totals, advances the
 * daily streak (at most once per calendar day), writes an audit-ledger
 * entry, and checks every not-yet-earned achievement against the resulting
 * real state.
 */
export async function awardXp(
  userId: string,
  input: AwardXpInput,
): Promise<AwardXpResultDTO> {
  const profile = await profileRepository.findByUserId(userId)
  if (!profile) {
    throw ApiError.internal('Profile record is missing for this account.')
  }

  const updatedProfile = await profileRepository.incrementXpAndCoins(
    userId,
    input.xpAmount,
    input.coinsAmount,
  )
  if (!updatedProfile) {
    throw ApiError.internal('Profile record is missing for this account.')
  }

  const streakResult = computeStreak(
    profile.streak.current,
    profile.streak.longest,
    profile.streak.lastActiveDate,
    new Date(),
  )
  if (streakResult.changed) {
    await profileRepository.updateStreak(userId, {
      current: streakResult.current,
      longest: streakResult.longest,
      lastActiveDate: streakResult.lastActiveDate,
    })
  }

  await xpTransactionRepository.create({
    userId,
    xpAmount: input.xpAmount,
    coinsAmount: input.coinsAmount,
    reason: input.reason,
    refId: input.refId,
  })

  const newlyUnlockedDefs = await checkAndUnlockAchievements(userId, streakResult.current)
  const newlyUnlockedAchievements: AchievementCatalogEntryDTO[] = newlyUnlockedDefs.map(
    (def) => ({
      code: def.code,
      title: def.title,
      description: def.description,
      earned: true,
      earnedAt: new Date().toISOString(),
    }),
  )

  return {
    xpAwarded: input.xpAmount,
    coinsAwarded: input.coinsAmount,
    totalXp: updatedProfile.xp,
    totalCoins: updatedProfile.coins,
    level: getLevelInfo(updatedProfile.xp),
    streak: { current: streakResult.current, longest: streakResult.longest },
    newlyUnlockedAchievements,
  }
}

// ---- Summary (Dashboard / Profile) ----

export interface GamificationSummaryDTO {
  xp: number
  coins: number
  xpGainedThisWeek: number
  level: LevelInfoDTO
  streak: { current: number; longest: number }
}

export async function getSummary(userId: string): Promise<GamificationSummaryDTO> {
  const profile = await profileRepository.findByUserId(userId)
  if (!profile) {
    throw ApiError.internal('Profile record is missing for this account.')
  }
  const since = new Date(Date.now() - 7 * DAY_MS)
  const xpGainedThisWeek = await xpTransactionRepository.sumXpSince(userId, since)

  return {
    xp: profile.xp,
    coins: profile.coins,
    xpGainedThisWeek,
    level: getLevelInfo(profile.xp),
    streak: { current: profile.streak.current, longest: profile.streak.longest },
  }
}
