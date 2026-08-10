import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { getRecentActivity } from '@/services/dashboardService'
import { formatRelativeTime } from '@/utils/format-date'

/** Widget 17 — Recent Activity (docs/Dashboard.md §17) — a plain,
 * reverse-chronological "what did I do" trail, distinct from Notifications
 * (what the platform surfaced) and Weekly Progress (an aggregate chart). */
export function RecentActivityCard() {
  const { t } = useTranslation('dashboard')
  const {
    data: activity,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: getRecentActivity,
  })

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <Heading variant="heading-4">{t('recentActivityCard.heading')}</Heading>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title={t('recentActivityCard.errorTitle')}
              onRetry={() => void refetch()}
            />
          ) : !activity ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <Text variant="body-sm">{t('recentActivityCard.emptyText')}</Text>
          ) : (
            <motion.ul
              variants={staggerChildren(0.05)}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-2"
            >
              {activity.map((item) => (
                <motion.li
                  key={item.id}
                  variants={fadeInUp}
                  className="flex items-start gap-2.5"
                >
                  <Activity
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col">
                    <Text as="span" variant="body-sm">
                      {item.label}
                    </Text>
                    <Text variant="caption">{formatRelativeTime(item.timestamp)}</Text>
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
