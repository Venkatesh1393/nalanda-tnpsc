import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp } from '@/animations/variants'
import { TrendLineChart } from '@/components/charts/trend-line-chart'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getWeeklyProgress } from '@/services/dashboardService'

/** Widget 8 — Weekly Progress (docs/Dashboard.md §8) — a 7-day study-minutes
 * trend, reusing the existing `TrendLineChart` rather than a new chart type. */
export function WeeklyProgressCard() {
  const { t } = useTranslation('dashboard')
  const {
    data: points,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'weekly-progress'],
    queryFn: getWeeklyProgress,
  })

  const daysActive = points?.filter((point) => point.value > 0).length ?? 0

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <Heading variant="heading-4">{t('weeklyProgressCard.heading')}</Heading>
          <Link
            to={ROUTES.analytics}
            className="text-primary text-sm font-medium hover:underline"
          >
            {t('weeklyProgressCard.viewFullAnalytics')}
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {isError ? (
            <ErrorState
              title={t('weeklyProgressCard.errorTitle')}
              onRetry={() => void refetch()}
            />
          ) : !points ? (
            <Skeleton className="h-[240px] w-full" />
          ) : daysActive === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-center">
              <Text variant="body-sm" className="max-w-xs">
                {t('weeklyProgressCard.emptyText')}
              </Text>
            </div>
          ) : (
            <>
              <Text variant="body-sm">
                {t('weeklyProgressCard.studiedDays', { count: daysActive })}
              </Text>
              <TrendLineChart data={points} />
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
