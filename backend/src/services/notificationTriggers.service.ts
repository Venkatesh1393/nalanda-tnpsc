import { NOTIFICATION_TRIGGER_CONFIG } from '../config/notifications.config'
import { Profile } from '../models/Profile.model'
import * as liveExamAttemptRepository from '../repositories/liveExamAttempt.repository'
import * as liveExamRepository from '../repositories/liveExam.repository'
import * as notificationRepository from '../repositories/notification.repository'
import * as profileRepository from '../repositories/profile.repository'
import * as questionAttemptRepository from '../repositories/questionAttempt.repository'
import * as subscriptionRepository from '../repositories/subscription.repository'
import { pickText } from './learn.service'
import { notifyUserIfEnabled } from './notification.service'

/**
 * Sprint 4 Step 62 — Notification Engine. Real, callable batch-scan
 * triggers for the three reminder categories this step asks for (Practice,
 * Weekly Exam, Subscription expiry) — no cron/queue infrastructure exists
 * anywhere in this codebase yet (`notification.service.ts`'s own header
 * note, `docs/MASTER_ROADMAP.md` Phase 13), so these aren't wired to an
 * automatic schedule; they're genuine functions a future job (or an admin
 * "send reminders now" action) can call, safe to call repeatedly thanks to
 * `notification.repository.ts#existsRecentForUser`'s dedupe guard. Current
 * Affairs alerts and Achievement-unlocked notices are event-triggered
 * instead (wired directly into `adminCurrentAffairs.service.ts`'s publish
 * action and `gamification.service.ts` respectively) — no scan needed since
 * a real "this just happened" moment already exists for both.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

export async function sendPracticeReminders(): Promise<number> {
  const cfg = NOTIFICATION_TRIGGER_CONFIG.practiceReminder
  const cutoff = new Date(Date.now() - cfg.inactivityDays * DAY_MS)
  const userIds = await questionAttemptRepository.findInactiveUserIds(cutoff)

  let sent = 0
  for (const userId of userIds) {
    const alreadySent = await notificationRepository.existsRecentForUser(
      userId,
      'study-reminder',
      cfg.dedupeWithinHours,
    )
    if (alreadySent) continue

    const result = await notifyUserIfEnabled(userId, {
      category: 'study-reminder',
      title: { en: 'Time for a quick practice session?' },
      body: {
        en: "You haven't practiced in a few days — a short session keeps your skills (and streak) sharp.",
      },
      deepLink: '/app/practice',
      actionLabel: { en: 'Start Practicing' },
    })
    if (result) sent += 1
  }
  return sent
}

export async function sendLiveExamReminders(): Promise<number> {
  const cfg = NOTIFICATION_TRIGGER_CONFIG.liveExamReminder
  const now = new Date()
  const windowEnd = new Date(now.getTime() + cfg.hoursAhead * HOUR_MS)

  const upcomingExams = await liveExamRepository.findByTab({ tab: 'upcoming', now })
  const soonExams = upcomingExams.filter((exam) => exam.scheduledStartAt <= windowEnd)

  let sent = 0
  for (const exam of soonExams) {
    const [candidateUserIds, attemptedUserIds] = await Promise.all([
      profileRepository.findUserIdsByExamGoal(exam.examId),
      liveExamAttemptRepository.findAttemptedUserIds(exam._id),
    ])
    const attemptedSet = new Set(attemptedUserIds.map((id) => id.toString()))
    const deepLink = `/app/live-exams/${exam.id}`
    const examTitle = pickText(exam.title, 'en')

    for (const userId of candidateUserIds) {
      if (attemptedSet.has(userId.toString())) continue
      const alreadySent = await notificationRepository.existsRecentForUser(
        userId,
        'exam-reminder',
        cfg.dedupeWithinHours,
        deepLink,
      )
      if (alreadySent) continue

      const result = await notifyUserIfEnabled(userId, {
        category: 'exam-reminder',
        title: { en: 'Weekly Live Exam starting soon' },
        body: {
          en: `"${examTitle}" starts soon — join in to compete on the leaderboard.`,
        },
        deepLink,
        actionLabel: { en: 'View Exam' },
      })
      if (result) sent += 1
    }
  }
  return sent
}

export async function sendSubscriptionExpiryReminders(): Promise<number> {
  const cfg = NOTIFICATION_TRIGGER_CONFIG.subscriptionExpiryReminder
  const now = new Date()
  const windowEnd = new Date(now.getTime() + cfg.daysAhead * DAY_MS)
  const expiring = await subscriptionRepository.findExpiringBetween(now, windowEnd)

  let sent = 0
  for (const subscription of expiring) {
    const alreadySent = await notificationRepository.existsRecentForUser(
      subscription.userId,
      'premium-update',
      cfg.dedupeWithinHours,
    )
    if (alreadySent) continue

    const daysLeft = Math.max(
      1,
      Math.ceil((subscription.currentPeriodEnd!.getTime() - now.getTime()) / DAY_MS),
    )
    const result = await notifyUserIfEnabled(subscription.userId, {
      category: 'premium-update',
      title: { en: 'Your subscription is expiring soon' },
      body: {
        en: `Your ${subscription.tier} plan renews or expires in ${daysLeft} day(s). Renew to keep uninterrupted access.`,
      },
      deepLink: '/app/settings/subscription',
      actionLabel: { en: 'Manage Subscription' },
    })
    if (result) sent += 1
  }
  return sent
}

/** Called once, right when a Current Affairs article genuinely becomes
 * published (`adminCurrentAffairs.service.ts`'s create/publish actions) —
 * an event trigger, not a scan, since the "just happened" moment is real
 * and unambiguous. Filters to users who opted into `currentAffairsAlert`
 * up front (one query) then batch-inserts, the same efficient fan-out
 * `notification.repository.ts#broadcastToUsers` already uses for admin
 * announcements — bypasses the per-user `notifyUser`/delivery-dispatch path
 * deliberately, the same accepted scope reduction `broadcastToUsers`
 * already discloses for a potentially-large recipient list. */
export async function sendCurrentAffairsAlert(
  articleId: string,
  articleTitle: string,
): Promise<number> {
  const profiles = await Profile.find({
    'notificationPreferences.currentAffairsAlert': true,
  }).select('userId')
  const userIds = profiles.map((profile) => profile.userId)
  if (userIds.length === 0) return 0

  await notificationRepository.broadcastToUsers(userIds, {
    category: 'current-affairs-alert',
    title: { en: 'New Current Affairs published' },
    body: { en: articleTitle },
    deepLink: `/app/current-affairs/${articleId}`,
    actionLabel: { en: 'Read Now' },
  })
  return userIds.length
}
