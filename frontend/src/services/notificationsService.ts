import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { NotificationItem } from '@/types/notifications'

/**
 * Domain calls for the real Notifications backend
 * (`backend/src/routes/notifications.routes.ts`) — replaces
 * `services/mock/notificationsMockService.ts`. The backend paginates
 * (this step's explicit "Support: pagination" requirement); the existing
 * `NotificationList` UI reads a flat array with no pager control of its own
 * (a deliberate "connect to the real API, don't redesign the working UI"
 * choice, matching this step's own instruction) — `getNotifications` fetches
 * one generously-sized page (`NOTIFICATION_PAGE_LIMIT`) and returns its
 * `items`, keeping the exact same `Promise<NotificationItem[]>` contract
 * every existing caller already expects.
 */

const NOTIFICATION_PAGE_LIMIT = 100

interface ApiEnvelope<T> {
  data: T
}

interface ApiNotificationItem {
  id: string
  category: NotificationItem['category']
  title: string
  message: string
  isRead: boolean
  isArchived: boolean
  createdAt: string
  actionLabel: string | null
  actionHref: string | null
}

function toNotificationItem(item: ApiNotificationItem): NotificationItem {
  return {
    id: item.id,
    category: item.category,
    title: item.title,
    message: item.message,
    isRead: item.isRead,
    isArchived: item.isArchived,
    createdAt: item.createdAt,
    actionLabel: item.actionLabel ?? undefined,
    actionHref: item.actionHref ?? undefined,
  }
}

/** `archived: true` reads the Archived view instead of the default
 * (non-archived) list — Sprint 4 Step 62's "Read / Unread / Mark Read /
 * Delete / Archive" support list. */
export async function getNotifications(
  options: { archived?: boolean } = {},
): Promise<NotificationItem[]> {
  const response = await apiClient.get<ApiEnvelope<ApiNotificationItem[]>>(
    endpoints.notifications.list,
    { params: { limit: NOTIFICATION_PAGE_LIMIT, isArchived: options.archived } },
  )
  return response.data.data.map(toNotificationItem)
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiClient.patch(endpoints.notifications.markRead(id))
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiClient.post(endpoints.notifications.markAllRead)
}

export async function archiveNotification(id: string): Promise<void> {
  await apiClient.patch(endpoints.notifications.archive(id))
}

export async function unarchiveNotification(id: string): Promise<void> {
  await apiClient.patch(endpoints.notifications.unarchive(id))
}

export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(endpoints.notifications.remove(id))
}

export async function getUnreadCount(): Promise<number> {
  const response = await apiClient.get<ApiEnvelope<{ unreadCount: number }>>(
    endpoints.notifications.unreadCount,
  )
  return response.data.data.unreadCount
}
