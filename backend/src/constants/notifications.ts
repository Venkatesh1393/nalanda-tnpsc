/**
 * Kept identical to `frontend/src/constants/notifications.ts`. Originally 4
 * categories (rather than `docs/InformationArchitecture.md` §7.7's 5 — see
 * `docs/PROJECT_CONTEXT.md` §13 for that already-flagged deviation);
 * extended to 6 for the real Notifications backend step, additively —
 * `achievement` (a real earned-badge notice) and `system-notice` (both
 * admin/system broadcasts and general platform announcements) are new,
 * the original 4 are unchanged.
 */
export const NOTIFICATION_CATEGORIES = [
  'exam-reminder',
  'study-reminder',
  'premium-update',
  'current-affairs-alert',
  'achievement',
  'system-notice',
] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

export const NOTIFICATION_CHANNELS = ['push', 'email', 'sms', 'in_app'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

/**
 * `scope: 'user'` is an ordinary, individually-targeted notification.
 * `scope: 'global'` marks one that was created as a broadcast/announcement
 * — per docs/Database.md §4.7's "broadcast fan-out" note, a global
 * notification is still physically one document per recipient (never a
 * single shared doc with per-user read state bolted on), so every existing
 * per-user read/unread/delete query keeps working unchanged; `scope` is
 * purely a provenance marker for "was this addressed to me specifically or
 * sent to everyone."
 */
export const NOTIFICATION_SCOPES = ['user', 'global'] as const
export type NotificationScope = (typeof NOTIFICATION_SCOPES)[number]
