import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getUpcomingExams } from '@/services/dashboardService'

const LIVE_SOON_WINDOW_MS = 1000 * 60 * 60

function formatSchedule(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Widget 13 — Upcoming Exams (docs/Dashboard.md §13) — scheduling
 * awareness for Live Exams, the platform's cohort-mock whitespace feature. */
export function UpcomingExamsCard() {
  const { t } = useTranslation('dashboard')
  const {
    data: exams,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'upcoming-exams'],
    queryFn: getUpcomingExams,
  })
  // A stable "now" for this mount (react-hooks/purity forbids calling the
  // impure `Date.now()` directly during render) — fine for a "starting
  // soon" flag that only needs to be roughly accurate per page view.
  const [now] = useState(() => Date.now())

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <Heading variant="heading-4">{t('upcomingExamsCard.heading')}</Heading>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title={t('upcomingExamsCard.errorTitle')}
              onRetry={() => void refetch()}
            />
          ) : !exams ? (
            <div className="flex flex-col gap-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : exams.length === 0 ? (
            <Text variant="body-sm">{t('upcomingExamsCard.emptyText')}</Text>
          ) : (
            <motion.ul
              variants={staggerChildren(0.06)}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-3"
            >
              {exams.map((exam) => {
                const isLiveSoon =
                  new Date(exam.scheduledStartAt).getTime() - now < LIVE_SOON_WINDOW_MS
                return (
                  <motion.li
                    key={exam.id}
                    variants={fadeInUp}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <CalendarClock
                        className="text-muted-foreground mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5">
                          <Text as="span" variant="body-md" className="font-medium">
                            {exam.title}
                          </Text>
                          {isLiveSoon && (
                            <Badge variant="success" className="animate-pulse">
                              {t('upcomingExamsCard.liveSoon')}
                            </Badge>
                          )}
                        </span>
                        <Text variant="caption">
                          {formatSchedule(exam.scheduledStartAt)}
                        </Text>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={ROUTES.liveExamDetail(exam.id)}>
                        {t('upcomingExamsCard.view')}
                      </Link>
                    </Button>
                  </motion.li>
                )
              })}
            </motion.ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
