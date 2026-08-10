import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp } from '@/animations/variants'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getDashboardSummary } from '@/services/dashboardService'

/**
 * Widget 2 — Daily Study Goal (docs/Dashboard.md §2) — shares its query with
 * the Welcome Banner/Stats Row/Premium Banner (docs/Dashboard.md §21).
 */
export function DailyStudyGoalCard() {
  const { t } = useTranslation('dashboard')
  const { data: summary } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
  })

  return (
    <motion.div variants={fadeInUp} className="h-full">
      <Card className="h-full">
        <CardHeader>
          <Heading variant="heading-4">{t('dailyStudyGoalCard.heading')}</Heading>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {summary ? (
            summary.dailyStudyGoalMinutes > 0 ? (
              <>
                <Progress
                  value={Math.min(
                    100,
                    Math.round(
                      (summary.todayStudyMinutesDone / summary.dailyStudyGoalMinutes) *
                        100,
                    ),
                  )}
                  aria-label={t('dailyStudyGoalCard.progressAriaLabel')}
                />
                <Text variant="body-sm" className="tabular-nums">
                  {t('dailyStudyGoalCard.minutesProgress', {
                    done: summary.todayStudyMinutesDone,
                    goal: summary.dailyStudyGoalMinutes,
                  })}
                </Text>
              </>
            ) : (
              <Text variant="body-sm">{t('dailyStudyGoalCard.noGoalSet')}</Text>
            )
          ) : (
            <>
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-4 w-32" />
            </>
          )}
          <Link
            to={ROUTES.settings('profile')}
            className="text-primary w-fit text-sm font-medium hover:underline"
          >
            {t('dailyStudyGoalCard.adjustGoal')}
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  )
}
