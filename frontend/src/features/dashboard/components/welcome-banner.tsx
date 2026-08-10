import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp } from '@/animations/variants'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getContinueLearning, getDashboardSummary } from '@/services/dashboardService'
import { slugify } from '@/utils/slugify'

function greetingKeyForHour(
  hour: number,
): 'welcomeBanner.greetingMorning' | 'welcomeBanner.greetingAfternoon' | 'welcomeBanner.greetingEvening' {
  if (hour < 12) return 'welcomeBanner.greetingMorning'
  if (hour < 17) return 'welcomeBanner.greetingAfternoon'
  return 'welcomeBanner.greetingEvening'
}

/**
 * Widget 1 — Welcome Banner (docs/Dashboard.md §1) — the page's own header
 * band, not a card among cards. Leads the page's staggered reveal.
 */
export function WelcomeBanner() {
  const { t } = useTranslation('dashboard')
  const { data: summary } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
  })
  // Shares its query key with `ContinueLearningCard` (docs/Dashboard.md §21)
  // — the "Continue Studying" CTA here points at the exact same content.
  const { data: continueLearning } = useQuery({
    queryKey: ['dashboard', 'continue-learning'],
    queryFn: getContinueLearning,
  })

  const continueHref = continueLearning
    ? ROUTES.learnLesson(
        slugify(continueLearning.subject),
        slugify(continueLearning.topic),
        slugify(continueLearning.subtopic),
      )
    : ROUTES.dashboard

  return (
    <motion.div
      variants={fadeInUp}
      className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
    >
      <div className="flex flex-col gap-1">
        {summary ? (
          <>
            <Heading variant="heading-2">
              {t(greetingKeyForHour(new Date().getHours()), { name: summary.userName })}
            </Heading>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground -ml-3 w-fit gap-1"
            >
              {summary.examGoal.label}
              <span aria-hidden="true">▾</span>
            </Button>
          </>
        ) : (
          <>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-24" />
          </>
        )}
      </div>

      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link to={continueHref}>{t('welcomeBanner.continueStudying')}</Link>
      </Button>
    </motion.div>
  )
}
