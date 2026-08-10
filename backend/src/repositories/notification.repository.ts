import type { Types } from 'mongoose'

import type { NotificationCategory, NotificationScope } from '../constants/notifications'
import {
  Notification,
  type INotification,
  type NotificationDocument,
} from '../models/Notification.model'

export interface ListFilter {
  isRead?: boolean
  category?: NotificationCategory
  /** Defaults to excluding archived notifications (the "tidied away" state)
   * unless the caller explicitly asks for `true` — the same default-hidden
   * convention soft-deleted content uses elsewhere in this codebase. */
  isArchived?: boolean
}

/** Sprint 4 Step 67 — a plain (`.lean()`) row, not a hydrated
 * `NotificationDocument`: this list is read once and mapped straight to a
 * DTO (`services/notification.service.ts#toDTO`), never `.save()`d, so
 * paying for Mongoose's change-tracking/getters on every page load (this is
 * one of the highest-traffic reads in the app — polled for the unread badge)
 * was pure overhead. Note the lack of a `.id` string virtual on a lean
 * result — callers use `_id.toString()` instead (see `toDTO`). */
export type NotificationRow = Pick<
  INotification,
  | 'category'
  | 'title'
  | 'body'
  | 'isRead'
  | 'isArchived'
  | 'actionLabel'
  | 'deepLink'
  | 'createdAt'
> & { _id: Types.ObjectId }

export async function findByUser(
  userId: Types.ObjectId | string,
  filter: ListFilter,
  page: number,
  limit: number,
): Promise<{ items: NotificationRow[]; total: number }> {
  const query: Record<string, unknown> = {
    userId,
    isArchived: filter.isArchived ?? false,
    ...(filter.isRead !== undefined && { isRead: filter.isRead }),
    ...(filter.category && { category: filter.category }),
  }
  const [items, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
  ])
  return { items, total }
}

export function countUnread(userId: Types.ObjectId | string): Promise<number> {
  return Notification.countDocuments({ userId, isRead: false, isArchived: false })
}

export function markRead(
  userId: Types.ObjectId | string,
  notificationId: Types.ObjectId | string,
): Promise<NotificationDocument | null> {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true },
  )
}

export async function markAllRead(userId: Types.ObjectId | string): Promise<number> {
  const result = await Notification.updateMany(
    { userId, isRead: false, isArchived: false },
    { $set: { isRead: true } },
  )
  return result.modifiedCount
}

export function archive(
  userId: Types.ObjectId | string,
  notificationId: Types.ObjectId | string,
): Promise<NotificationDocument | null> {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isArchived: true, archivedAt: new Date() } },
    { new: true },
  )
}

export function unarchive(
  userId: Types.ObjectId | string,
  notificationId: Types.ObjectId | string,
): Promise<NotificationDocument | null> {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isArchived: false }, $unset: { archivedAt: '' } },
    { new: true },
  )
}

export async function remove(
  userId: Types.ObjectId | string,
  notificationId: Types.ObjectId | string,
): Promise<boolean> {
  const result = await Notification.deleteOne({ _id: notificationId, userId })
  return result.deletedCount > 0
}

export interface CreateNotificationInput extends Pick<
  INotification,
  'category' | 'title' | 'body' | 'deepLink' | 'actionLabel'
> {
  userId: Types.ObjectId | string
  scope?: NotificationScope
  channel?: INotification['channel']
}

export function create(input: CreateNotificationInput): Promise<NotificationDocument> {
  return Notification.create(input)
}

/** Broadcast fan-out (docs/Database.md §4.7) — one real document per
 * recipient, `scope: 'global'` as provenance. A simple in-request loop is
 * an accepted, disclosed scope reduction at this user volume; the doc's own
 * "batch-inserts asynchronously" note is the natural next step once a real
 * job queue exists (out of this step's scope, no Admin Panel/queue exists
 * yet either). */
export function broadcastToUsers(
  userIds: (Types.ObjectId | string)[],
  content: Pick<
    INotification,
    'category' | 'title' | 'body' | 'deepLink' | 'actionLabel'
  >,
): Promise<unknown> {
  const scope: NotificationScope = 'global'
  return Notification.insertMany(userIds.map((userId) => ({ ...content, userId, scope })))
}

/** Idempotency guard for the batch reminder triggers (Sprint 4 Step 62) —
 * "has this user already been sent this category of notification within
 * the last `withinHours`" — so a reminder trigger is safe to call
 * repeatedly (e.g. by a future cron running more often than the reminder
 * should actually fire) without spamming the same user every invocation. */
export async function existsRecentForUser(
  userId: Types.ObjectId | string,
  category: NotificationCategory,
  withinHours: number,
  deepLink?: string,
): Promise<boolean> {
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000)
  const match = await Notification.exists({
    userId,
    category,
    createdAt: { $gte: since },
    ...(deepLink !== undefined && { deepLink }),
  })
  return match !== null
}
