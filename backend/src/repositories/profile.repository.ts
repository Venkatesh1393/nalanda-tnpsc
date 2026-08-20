import type { Types } from 'mongoose'

import {
  Profile,
  type IExamGoal,
  type IOnboardingState,
  type ProfileDocument,
} from '../models/Profile.model'

/** The real candidate list behind the Weekly Live Exam reminder (Sprint 4
 * Step 62) — every user with this exam among their `examGoals`, regardless
 * of whether it's marked primary (any real goal is relevant enough to warn
 * about an upcoming exam for it). */
export function findUserIdsByExamGoal(
  examId: Types.ObjectId | string,
): Promise<Types.ObjectId[]> {
  return Profile.find({ 'examGoals.examId': examId })
    .select('userId')
    .then((docs) => docs.map((doc) => doc.userId))
}

export function findByUserId(
  userId: Types.ObjectId | string,
): Promise<ProfileDocument | null> {
  return Profile.findOne({ userId })
}

/** Batch lookup for ranking/leaderboard-style reads that need many users'
 * display names/exam goals in one round trip rather than N sequential
 * `findByUserId` calls. */
export function findByUserIds(
  userIds: (Types.ObjectId | string)[],
): Promise<ProfileDocument[]> {
  return Profile.find({ userId: { $in: userIds } })
}

export function create(data: {
  userId: Types.ObjectId
  name: string
  photoUrl?: string
}): Promise<ProfileDocument> {
  return Profile.create(data)
}

export function updateBasicInfo(
  userId: Types.ObjectId | string,
  patch: { name?: string; photoUrl?: string | null },
): Promise<ProfileDocument | null> {
  const $set: Record<string, unknown> = {}
  const $unset: Record<string, unknown> = {}
  if (patch.name !== undefined) $set.name = patch.name
  if (patch.photoUrl === null) $unset.photoUrl = ''
  else if (patch.photoUrl !== undefined) $set.photoUrl = patch.photoUrl

  const update: Record<string, unknown> = {}
  if (Object.keys($set).length > 0) update.$set = $set
  if (Object.keys($unset).length > 0) update.$unset = $unset

  return Profile.findOneAndUpdate({ userId }, update, { new: true })
}

/** Sets the avatar to a freshly-uploaded Cloudinary asset — always both
 * fields together, since a `photoUrl` without its `photoPublicId` could
 * never be deleted/replaced again. */
export function updateAvatar(
  userId: Types.ObjectId | string,
  photo: { photoUrl: string; photoPublicId: string },
): Promise<ProfileDocument | null> {
  return Profile.findOneAndUpdate({ userId }, { $set: photo }, { new: true })
}

export function clearAvatar(
  userId: Types.ObjectId | string,
): Promise<ProfileDocument | null> {
  return Profile.findOneAndUpdate(
    { userId },
    { $unset: { photoUrl: '', photoPublicId: '' } },
    { new: true },
  )
}

export function updateTheme(
  userId: Types.ObjectId | string,
  theme: 'light' | 'dark' | 'system',
): Promise<ProfileDocument | null> {
  return Profile.findOneAndUpdate({ userId }, { $set: { theme } }, { new: true })
}

export function updateNotificationPreferences(
  userId: Types.ObjectId | string,
  patch: Partial<{
    examReminder: boolean
    studyReminder: boolean
    premiumUpdate: boolean
    currentAffairsAlert: boolean
  }>,
): Promise<ProfileDocument | null> {
  const $set: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) $set[`notificationPreferences.${key}`] = value
  }
  return Profile.findOneAndUpdate({ userId }, { $set }, { new: true })
}

/** Partial save of the onboarding wizard's in-progress state (Step 44 §B) —
 * called after every step so a mid-wizard refresh never loses progress.
 * Never touches `completed`/`completedAt`; only `completeOnboarding` below does. */
export function saveOnboardingDraft(
  userId: Types.ObjectId | string,
  patch: Partial<Omit<IOnboardingState, 'completed' | 'completedAt'>>,
): Promise<ProfileDocument | null> {
  const $set: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) $set[`onboarding.${key}`] = value
  }
  return Profile.findOneAndUpdate({ userId }, { $set }, { new: true })
}

/** `coins` is a spendable balance (can rise and fall, `docs/Smart_Practice.md`
 * §14) — `$inc` with a possibly-negative `coinsDelta` handles both
 * directions; `xp` only ever increases in practice since every caller today
 * only awards positive amounts, but nothing here assumes that. */
export function incrementXpAndCoins(
  userId: Types.ObjectId | string,
  xpDelta: number,
  coinsDelta: number,
): Promise<ProfileDocument | null> {
  return Profile.findOneAndUpdate(
    { userId },
    { $inc: { xp: xpDelta, coins: coinsDelta } },
    { new: true },
  )
}

export function updateStreak(
  userId: Types.ObjectId | string,
  streak: { current: number; longest: number; lastActiveDate: Date },
): Promise<ProfileDocument | null> {
  return Profile.findOneAndUpdate(
    { userId },
    { $set: { streak } },
    { new: true },
  )
}

/** Set once by the ₹29 one-time Previous Year Question Papers unlock
 * purchase (`payment.service.ts#activatePaperUnlockForPayment`) — mirrors
 * `userRepository.updateSubscriptionTier`'s shape for the equivalent
 * subscription-side flag. */
export function setPreviousYearPapersUnlocked(
  userId: Types.ObjectId | string,
  value: boolean,
): Promise<ProfileDocument | null> {
  return Profile.findOneAndUpdate(
    { userId },
    { $set: { previousYearPapersUnlocked: value } },
    { new: true },
  )
}

export function completeOnboarding(
  userId: Types.ObjectId | string,
  onboarding: Omit<IOnboardingState, 'completed' | 'completedAt'>,
  examGoals: IExamGoal[],
): Promise<ProfileDocument | null> {
  return Profile.findOneAndUpdate(
    { userId },
    {
      $set: {
        onboarding: { ...onboarding, completed: true, completedAt: new Date() },
        examGoals,
      },
    },
    { new: true },
  )
}
