import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, LayoutDashboard } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { EmptyState } from '@/components/empty-state'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import {
  AnalyticsSummaryRow,
  GoalCompletionChart,
  MonthlyProgressChart,
  PracticeHistoryChart,
  QuestionDifficultyChart,
  RankPredictionChart,
  SpeedAnalysisChart,
  StrongAreasChart,
  SubjectAccuracyChart,
  WeakAreasChart,
  WeeklyStudyTimeChart,
} from '@/features/analytics'
import { getAnalyticsSummary } from '@/services/analyticsService'

/**
 * The Analytics module — a single "professional dashboard" page (not the
 * per-view `/app/analytics/:view` split the illustrative route map once
 * suggested, per this session's build instruction) presenting all 9 charts
 * together. Renders its own minimal chrome-free header directly rather
 * than a real sidebar/top-bar shell, the same known, temporary
 * simplification `pages/dashboard/dashboard-page.tsx` already uses —
 * `layouts/dashboard-layout.tsx` (docs/InformationArchitecture.md §4) is
 * still docs/MASTER_ROADMAP.md Phase 7 and doesn't exist yet.
 */
export function AnalyticsPage() {
  const { t } = useTranslation('analytics')
  const navigate = useNavigate()
  // Same query key `AnalyticsSummaryRow` uses below — React Query dedupes
  // this into a single `GET /analytics/overview` request, not two.
  const { data: summary } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: getAnalyticsSummary,
  })

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to={ROUTES.dashboard}>
              <LayoutDashboard className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('analyticsPage.dashboardLink')}</span>
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <motion.main
        variants={staggerChildren(0.08)}
        initial="hidden"
        animate="visible"
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"
      >
        <motion.div variants={fadeInUp} className="flex flex-col gap-1">
          <Heading variant="heading-2">{t('analyticsPage.heading')}</Heading>
          <Text variant="body-sm">{t('analyticsPage.subtitle')}</Text>
        </motion.div>

        {summary && !summary.hasActivity ? (
          // A brand-new user has no `QuestionAttempt`s yet — showing any of
          // the charts below would mean rendering them on empty/zeroed data
          // that reads as a real (if bad) score, which this step's explicit
          // "a new user must NOT see fake charts" rule forbids. One honest
          // empty state replaces the entire dashboard below the summary row.
          <motion.div variants={fadeInUp}>
            <EmptyState
              icon={BarChart3}
              title={t('analyticsPage.emptyState.title')}
              description={t('analyticsPage.emptyState.description')}
              actionLabel={t('analyticsPage.emptyState.actionLabel')}
              onAction={() => navigate(ROUTES.practice('quiz'))}
            />
          </motion.div>
        ) : (
          <>
            <motion.div variants={fadeInUp}>
              <AnalyticsSummaryRow />
            </motion.div>

            {!summary ? (
              <motion.div variants={fadeInUp} className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </motion.div>
            ) : (
              <>
                <motion.div variants={fadeInUp} className="grid gap-4 lg:grid-cols-2">
                  <SubjectAccuracyChart />
                  <GoalCompletionChart />
                </motion.div>

                <motion.div variants={fadeInUp} className="grid gap-4 lg:grid-cols-2">
                  <WeeklyStudyTimeChart />
                  <MonthlyProgressChart />
                </motion.div>

                <motion.div variants={fadeInUp} className="grid gap-4 lg:grid-cols-2">
                  <WeakAreasChart />
                  <StrongAreasChart />
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <PracticeHistoryChart />
                </motion.div>

                <motion.div variants={fadeInUp} className="grid gap-4 lg:grid-cols-2">
                  <SpeedAnalysisChart />
                  <RankPredictionChart />
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <QuestionDifficultyChart />
                </motion.div>
              </>
            )}
          </>
        )}
      </motion.main>
    </div>
  )
}
