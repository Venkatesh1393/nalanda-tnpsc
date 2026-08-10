import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getDashboardNotifications } from '@/services/dashboardService'
import { formatRelativeTime } from '@/utils/format-date'

/** Widget 16 — Notifications (docs/Dashboard.md §16) — a Dashboard-content
 * preview of the same data the persistent top-bar bell will show once
 * `dashboard-layout.tsx` exists; not a replacement for that bell. "View All"
 * now links to the real Notification Center (`/app/notifications`, built
 * 2026-07-31) rather than `settings('notifications')` — that path is the
 * Settings module's still-unbuilt notification *preferences* tab, not this
 * list, and was never actually correct here. */
export function NotificationsCard() {
  const { t } = useTranslation('dashboard')
  const {
    data: notifications,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'notifications'],
    queryFn: getDashboardNotifications,
  })

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <Heading variant="heading-4">{t('notificationsCard.heading')}</Heading>
          <Link
            to={ROUTES.notifications}
            className="text-primary text-sm font-medium hover:underline"
          >
            {t('notificationsCard.viewAll')}
          </Link>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title={t('notificationsCard.errorTitle')}
              onRetry={() => void refetch()}
            />
          ) : !notifications ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Text variant="body-sm">{t('notificationsCard.emptyText')}</Text>
          ) : (
            <motion.ul
              variants={staggerChildren(0.05)}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-2"
            >
              {notifications.map((notification) => (
                <motion.li
                  key={notification.id}
                  variants={fadeInUp}
                  className="flex items-start gap-2.5"
                >
                  <span className="relative mt-1 shrink-0">
                    <Bell className="text-muted-foreground size-4" aria-hidden="true" />
                    {!notification.isRead && (
                      <span
                        className="bg-primary absolute -top-0.5 -right-0.5 size-1.5 rounded-full"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <div className="flex flex-col">
                    <Text
                      as="span"
                      variant="body-sm"
                      className={notification.isRead ? undefined : 'font-medium'}
                    >
                      {notification.title}
                    </Text>
                    <Text variant="caption">
                      {formatRelativeTime(notification.createdAt)}
                    </Text>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
