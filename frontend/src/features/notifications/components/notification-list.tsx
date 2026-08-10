import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, BellOff, CheckCheck, Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { staggerChildren } from '@/animations/variants'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import {
  CategoryFilter,
  type NotificationCategoryFilterValue,
} from '@/features/notifications/components/category-filter'
import { NotificationCard } from '@/features/notifications/components/notification-card'
import {
  archiveNotification,
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  unarchiveNotification,
} from '@/services/notificationsService'

/** The Notification Center's core list (docs/InformationArchitecture.md
 * §7.7) — category filter chips, an Active/Archived view toggle (Sprint 4
 * Step 62's "Archive" support), an unread-count summary line with a "Mark
 * all as read" bulk action, and the filtered list itself. Owns its own
 * query + mutations, the same ownership shape `features/current-affairs/
 * components/current-affairs-feed.tsx` already established. */
export function NotificationList() {
  const { t } = useTranslation('notifications')
  const queryClient = useQueryClient()
  const [category, setCategory] = useState<NotificationCategoryFilterValue>('all')
  const [showArchived, setShowArchived] = useState(false)

  const queryKey = ['notifications', { archived: showArchived }]
  const {
    data: notifications,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => getNotifications({ archived: showArchived }),
  })

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: invalidateAll,
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: invalidateAll,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: invalidateAll,
  })

  const archiveToggleMutation = useMutation({
    mutationFn: (notification: { id: string; isArchived: boolean }) =>
      notification.isArchived
        ? unarchiveNotification(notification.id)
        : archiveNotification(notification.id),
    onSuccess: invalidateAll,
  })

  const filtered = useMemo(() => {
    if (!notifications) return undefined
    return category === 'all'
      ? notifications
      : notifications.filter((n) => n.category === category)
  }, [notifications, category])

  const unreadCount = useMemo(
    () => notifications?.filter((n) => !n.isRead).length ?? 0,
    [notifications],
  )

  if (isError) {
    return (
      <ErrorState
        title={t('notificationList.loadErrorTitle')}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CategoryFilter value={category} onChange={setCategory} />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowArchived((prev) => !prev)}
        >
          {showArchived ? (
            <Inbox aria-hidden="true" />
          ) : (
            <Archive aria-hidden="true" />
          )}
          {showArchived
            ? t('notificationList.viewActive')
            : t('notificationList.viewArchived')}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Text variant="body-sm">
          {notifications
            ? showArchived
              ? t('notificationList.archivedCount', { count: notifications.length })
              : unreadCount > 0
                ? t('notificationList.unreadCount', { count: unreadCount })
                : t('notificationList.allCaughtUp')
            : ' '}
        </Text>
        {!showArchived && unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            loading={markAllAsReadMutation.isPending}
            onClick={() => markAllAsReadMutation.mutate()}
          >
            <CheckCheck aria-hidden="true" />
            {t('notificationList.markAllAsRead')}
          </Button>
        )}
      </div>

      {!filtered ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={showArchived ? Archive : BellOff}
          title={
            showArchived ? t('notificationList.emptyArchivedTitle') : t('notificationList.emptyTitle')
          }
          description={
            showArchived
              ? t('notificationList.emptyArchivedDescription')
              : category === 'all'
                ? t('notificationList.emptyDescriptionAll')
                : t('notificationList.emptyDescriptionCategory')
          }
        />
      ) : (
        <motion.ul
          variants={staggerChildren(0.05)}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3"
        >
          {filtered.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              onArchiveToggle={(id) =>
                archiveToggleMutation.mutate({ id, isArchived: notification.isArchived })
              }
              deletePending={
                deleteMutation.isPending && deleteMutation.variables === notification.id
              }
              archiveTogglePending={
                archiveToggleMutation.isPending &&
                archiveToggleMutation.variables?.id === notification.id
              }
            />
          ))}
        </motion.ul>
      )}
    </div>
  )
}
