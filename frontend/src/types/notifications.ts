/**
 * Notifications module DTOs (docs/InformationArchitecture.md §7.7 — "a flat
 * list module, no deep hierarchy"). This build's category set was originally
 * specified as 4 categories (Exam Reminders, Study Reminders, Premium
 * Updates, Current Affairs Alerts) rather than `InformationArchitecture.md`
 * §7.7's 5 — see docs/PROJECT_CONTEXT.md §14 for that already-flagged
 * deviation. The real Notifications backend step added 2 more, additively
 * (`achievement`, `system-notice`, the latter also covering global
 * announcements) — the original 4 are unchanged.
 */

export type NotificationCategoryId =
  | 'exam-reminder'
  | 'study-reminder'
  | 'premium-update'
  | 'current-affairs-alert'
  | 'achievement'
  | 'system-notice'

export type NotificationCategory = {
  id: NotificationCategoryId
  label: string
}

export type NotificationItem = {
  id: string
  category: NotificationCategoryId
  title: string
  message: string
  createdAt: string
  isRead: boolean
  /** Real as of Sprint 4 Step 62 — a non-destructive "tidy away," distinct
   * from deletion; archived notifications are excluded from the default
   * list unless explicitly requested. */
  isArchived: boolean
  /** Optional deep link into the module the notification is about (a Learn
   * lesson, a Practice mode, a Current Affairs article, ...) — clicking it
   * also marks the notification read, the same "acting on it implies
   * reading it" convention `features/learn` bookmarks already assume. */
  actionLabel?: string
  actionHref?: string
}
