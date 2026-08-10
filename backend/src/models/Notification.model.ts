import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_SCOPES,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationScope,
} from '../constants/notifications'
import { bilingualField, type BilingualText } from './shared/bilingualText'

const NINETY_DAYS_IN_SECONDS = 90 * 24 * 60 * 60

/**
 * `category` (6 values as of the real Notifications step) replaces
 * `docs/Database.md` §4.7's broader `type` enum (5 values) to match the
 * already-built `frontend/src/constants/notifications.ts` scope — see
 * `docs/PROJECT_CONTEXT.md` §13's already-accepted deviation.
 */
export interface INotification {
  userId: Types.ObjectId
  category: NotificationCategory
  scope: NotificationScope
  title: BilingualText
  body: BilingualText
  channel: NotificationChannel
  isRead: boolean
  /** Sprint 4 Step 62 (Notification Engine) — archived notifications are
   * hidden from the default list (same "excluded unless asked for" pattern
   * as soft-deleted content elsewhere) without being destroyed, distinct
   * from `remove` (a real, permanent delete) — "tidy up without losing
   * history" vs. "get rid of this." */
  isArchived: boolean
  archivedAt?: Date
  deepLink?: string
  /** A short call-to-action label for `deepLink` (e.g. "Take a Mock Test")
   * — optional, since not every notification has (or needs) one; the
   * frontend falls back to a generic "View" when absent. */
  actionLabel?: BilingualText
  /** Populated by `timestamps: { createdAt: true }` below — declared here
   * only so TypeScript knows it exists on a hydrated document (same pattern
   * as `Bookmark.model.ts`'s `createdAt`). */
  createdAt: Date
}

export type NotificationDocument = HydratedDocument<INotification>

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: NOTIFICATION_CATEGORIES, required: true },
    scope: { type: String, enum: NOTIFICATION_SCOPES, default: 'user' },
    title: bilingualField({ required: true }),
    body: bilingualField({ required: true }),
    channel: { type: String, enum: NOTIFICATION_CHANNELS, default: 'in_app' },
    isRead: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    deepLink: { type: String, trim: true },
    actionLabel: bilingualField({ requireAtLeastOne: false }),
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

notificationSchema.index({ userId: 1, isArchived: 1, isRead: 1, createdAt: -1 })
// docs/Database.md §9.3: notifications have near-zero value after ~90 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NINETY_DAYS_IN_SECONDS })

export const Notification = model<INotification>('Notification', notificationSchema)
