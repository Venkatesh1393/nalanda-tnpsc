import type { Types } from 'mongoose'

import type { BadgeCode } from '../constants/badges'
import type { NotificationCategory, NotificationChannel } from '../constants/notifications'
import type { IProfile } from '../models/Profile.model'
import { Profile } from '../models/Profile.model'
import type { NotificationDocument } from '../models/Notification.model'
import { User } from '../models/User.model'
import * as notificationRepository from '../repositories/notification.repository'
import type { ListFilter, NotificationRow } from '../repositories/notification.repository'
import { ApiError } from '../utils/ApiError'
import { pickText, type DisplayLanguage } from './learn.service'
import { dispatch } from './notificationDelivery.service'

export interface NotificationDTO {
  id: string
  category: NotificationCategory
  title: string
  message: string
  isRead: boolean
  isArchived: boolean
  createdAt: string
  actionLabel: string | null
  actionHref: string | null
}

function toDTO(notification: NotificationRow, lang: DisplayLanguage): NotificationDTO {
  return {
    id: notification._id.toString(),
    category: notification.category,
    title: pickText(notification.title, lang),
    message: pickText(notification.body, lang),
    isRead: notification.isRead,
    isArchived: notification.isArchived,
    createdAt: notification.createdAt.toISOString(),
    actionLabel: notification.actionLabel
      ? pickText(notification.actionLabel, lang)
      : null,
    actionHref: notification.deepLink ?? null,
  }
}

export interface NotificationPageDTO {
  items: NotificationDTO[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export async function getNotifications(
  userId: string,
  filter: ListFilter,
  page: number,
  limit: number,
  lang: DisplayLanguage,
): Promise<NotificationPageDTO> {
  const { items, total } = await notificationRepository.findByUser(
    userId,
    filter,
    page,
    limit,
  )
  return {
    items: items.map((item) => toDTO(item, lang)),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  return notificationRepository.countUnread(userId)
}

export async function markAsRead(
  userId: string,
  notificationId: string,
): Promise<{ notificationId: string; isRead: true }> {
  const updated = await notificationRepository.markRead(userId, notificationId)
  if (!updated) throw ApiError.notFound('Notification not found')
  return { notificationId: updated.id, isRead: true }
}

export async function markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
  const updatedCount = await notificationRepository.markAllRead(userId)
  return { updatedCount }
}

/** Archive/unarchive — a non-destructive "tidy this away" distinct from
 * `remove` below (a real, permanent delete). Sprint 4 Step 62's explicit
 * "Read / Unread / Mark Read / Delete / Archive" support list. */
export async function archive(
  userId: string,
  notificationId: string,
): Promise<{ notificationId: string; isArchived: true }> {
  const updated = await notificationRepository.archive(userId, notificationId)
  if (!updated) throw ApiError.notFound('Notification not found')
  return { notificationId: updated.id, isArchived: true }
}

export async function unarchive(
  userId: string,
  notificationId: string,
): Promise<{ notificationId: string; isArchived: false }> {
  const updated = await notificationRepository.unarchive(userId, notificationId)
  if (!updated) throw ApiError.notFound('Notification not found')
  return { notificationId: updated.id, isArchived: false }
}

export async function remove(userId: string, notificationId: string): Promise<void> {
  const removed = await notificationRepository.remove(userId, notificationId)
  if (!removed) throw ApiError.notFound('Notification not found')
}

// ---- Real, callable triggers — not wired to an automatic scheduler yet
// (no cron/queue infrastructure exists, docs/MASTER_ROADMAP.md Phase 13),
// but genuine service functions a future job/Admin action can call, and
// what the dev seed / `verifyNotifications.ts` uses to prove each
// notification type is real. `services/notificationTriggers.service.ts`
// (Sprint 4 Step 62) builds the batch-scan reminders (Practice, Weekly
// Live Exam, Subscription expiry) on top of the primitives below. ----

export interface NotificationContent {
  category: NotificationCategory
  title: { en: string; ta?: string }
  body: { en: string; ta?: string }
  deepLink?: string
  actionLabel?: { en: string; ta?: string }
  /** Defaults to `in_app` (the model's own schema default) — a trigger can
   * request a different channel explicitly; `notificationDelivery.service.ts`
   * genuinely attempts that channel (gracefully degrading, never
   * fabricating delivery, when no provider is configured — Sprint 4 Step
   * 62's "future ready for Email/SMS/Push" requirement). */
  channel?: NotificationChannel
}

/** The one real chokepoint every notification is created through — always
 * persists first (the in-app notification is never lost even if a
 * secondary channel's delivery attempt fails), then attempts delivery via
 * the requested channel. */
export async function notifyUser(
  userId: Types.ObjectId | string,
  content: NotificationContent,
): Promise<NotificationDocument> {
  const notification = await notificationRepository.create({ userId, ...content })
  await dispatch(notification)
  return notification
}

/** Maps a category to the `Profile.notificationPreferences` toggle that
 * gates it — `achievement`/`system-notice` have no user-facing toggle in
 * that 4-field preference set (an earned achievement and a platform
 * announcement are never user-silenceable), so they're always sent. */
const PREFERENCE_KEY_BY_CATEGORY: Partial<
  Record<NotificationCategory, keyof IProfile['notificationPreferences']>
> = {
  'exam-reminder': 'examReminder',
  'study-reminder': 'studyReminder',
  'premium-update': 'premiumUpdate',
  'current-affairs-alert': 'currentAffairsAlert',
}

export async function isCategoryEnabledForUser(
  userId: Types.ObjectId | string,
  category: NotificationCategory,
): Promise<boolean> {
  const preferenceKey = PREFERENCE_KEY_BY_CATEGORY[category]
  if (!preferenceKey) return true
  const profile = await Profile.findOne({ userId }).select('notificationPreferences')
  // Fail open — a missing profile should never silently swallow a real
  // notification; the preference only suppresses when it's explicitly off.
  if (!profile) return true
  return profile.notificationPreferences[preferenceKey]
}

/** The preference-respecting variant every batch reminder trigger uses —
 * returns `null` (not an error) when the user has turned this category off,
 * so a caller counting "how many were sent" can just filter falsy results. */
export async function notifyUserIfEnabled(
  userId: Types.ObjectId | string,
  content: NotificationContent,
): Promise<NotificationDocument | null> {
  const enabled = await isCategoryEnabledForUser(userId, content.category)
  if (!enabled) return null
  return notifyUser(userId, content)
}

export function notifyAchievementEarned(
  userId: Types.ObjectId | string,
  badgeCode: BadgeCode,
  badgeTitle: string,
): Promise<NotificationDocument> {
  return notifyUser(userId, {
    category: 'achievement',
    title: { en: 'Achievement unlocked' },
    body: { en: `You earned the "${badgeTitle}" badge (${badgeCode}). Keep it up!` },
  })
}

/** System-wide announcement — one real `Notification` document per active
 * user (see `repositories/notification.repository.ts`'s `broadcastToUsers`
 * header for the fan-out design note). Wired to `POST /admin/notifications/
 * broadcast` (Sprint 4 Step 62). */
export async function broadcastSystemNotice(
  content: Omit<NotificationContent, 'category'>,
): Promise<number> {
  const users = await User.find({ status: 'active' }).select('_id')
  const userIds = users.map((user) => user._id)
  if (userIds.length === 0) return 0
  await notificationRepository.broadcastToUsers(userIds, {
    ...content,
    category: 'system-notice',
  })
  return userIds.length
}
