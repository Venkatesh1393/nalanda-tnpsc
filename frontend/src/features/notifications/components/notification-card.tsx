import { motion } from 'framer-motion'
import { Archive, ArchiveRestore, Check, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, motionFast } from '@/animations/variants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Text } from '@/components/typography'
import { cn } from '@/lib/utils'
import { NOTIFICATION_CATEGORY_ICONS } from '@/features/notifications/lib/category-icons'
import { formatRelativeTime } from '@/utils/format-date'
import type { NotificationItem } from '@/types/notifications'

type NotificationCardProps = {
  notification: NotificationItem
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onArchiveToggle: (id: string) => void
  deletePending?: boolean
  archiveTogglePending?: boolean
}

/** One row in the Notification Center — category icon + badge, unread dot,
 * title/message, relative time, an optional deep link into the module the
 * notification is about (marks it read on click, the same "acting on it
 * implies reading it" convention Learn's bookmarks assume), and explicit
 * Mark as read / Archive (or Unarchive) / Delete actions. */
export function NotificationCard({
  notification,
  onMarkAsRead,
  onDelete,
  onArchiveToggle,
  deletePending = false,
  archiveTogglePending = false,
}: NotificationCardProps) {
  const { t } = useTranslation('notifications')
  const Icon = NOTIFICATION_CATEGORY_ICONS[notification.category]

  return (
    <motion.li variants={fadeInUp} layout transition={motionFast}>
      <Card className={cn(!notification.isRead && 'border-primary/40 bg-primary/[0.03]')}>
        <CardContent className="flex items-start gap-3">
          <span className="relative mt-0.5 shrink-0">
            <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-full">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            {!notification.isRead && (
              <span
                className="bg-primary border-background absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2"
                aria-hidden="true"
              />
            )}
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {t(`categories.${notification.category}`)}
                </Badge>
                <Text variant="caption">
                  {formatRelativeTime(notification.createdAt)}
                </Text>
              </div>
              <div className="flex items-center gap-1">
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('notificationCard.markAsRead')}
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <Check aria-hidden="true" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    notification.isArchived
                      ? t('notificationCard.unarchive')
                      : t('notificationCard.archive')
                  }
                  disabled={archiveTogglePending}
                  onClick={() => onArchiveToggle(notification.id)}
                >
                  {notification.isArchived ? (
                    <ArchiveRestore aria-hidden="true" />
                  ) : (
                    <Archive aria-hidden="true" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('notificationCard.delete')}
                  disabled={deletePending}
                  onClick={() => onDelete(notification.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>

            <Text
              as="h3"
              variant="body-md"
              className={cn(
                notification.isRead
                  ? 'text-muted-foreground'
                  : 'text-foreground font-medium',
              )}
            >
              {notification.title}
            </Text>
            <Text variant="body-sm">{notification.message}</Text>

            {notification.actionHref && (
              <Link
                to={notification.actionHref}
                onClick={() => onMarkAsRead(notification.id)}
                className="text-primary mt-1 w-fit text-sm font-medium hover:underline"
              >
                {notification.actionLabel ?? t('notificationCard.viewAction')} &rarr;
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.li>
  )
}
