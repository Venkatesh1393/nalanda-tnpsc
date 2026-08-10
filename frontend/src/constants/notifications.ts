import type { NotificationCategory } from '@/types/notifications'

/**
 * The 6 Notification categories (see `types/notifications.ts`'s header
 * comment for the 4-then-6 history) — same static-reference-data pattern
 * `constants/currentAffairs.ts` already established.
 */
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  { id: 'exam-reminder', label: 'Exam Reminders' },
  { id: 'study-reminder', label: 'Study Reminders' },
  { id: 'premium-update', label: 'Premium Updates' },
  { id: 'current-affairs-alert', label: 'Current Affairs Alerts' },
  { id: 'achievement', label: 'Achievements' },
  { id: 'system-notice', label: 'System Notices' },
]

export function getNotificationCategoryLabel(id: NotificationCategory['id']): string {
  return NOTIFICATION_CATEGORIES.find((c) => c.id === id)?.label ?? id
}
