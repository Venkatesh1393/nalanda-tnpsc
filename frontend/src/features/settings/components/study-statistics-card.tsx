import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Coins, Flame, Target, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { getAnalyticsSummary } from '@/services/analyticsService'
import { getDashboardSummary } from '@/services/dashboardService'

/** Study statistics — reuses the same mocked cross-module numbers
 * `features/analytics/components/analytics-summary-row.tsx` and Dashboard's
 * `StatsRow` already read (`getAnalyticsSummary`/`getDashboardSummary`),
 * the established "shared mock world" precedent, rather than inventing a
 * third set of numbers here. */
export function StudyStatisticsCard() {
  const { t } = useTranslation('settings')
  const analytics = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: getAnalyticsSummary,
  })
  const summary = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
  })

  if (analytics.isError || summary.isError) {
    return (
      <ErrorState
        title={t('studyStatisticsCard.loadErrorTitle')}
        onRetry={() => {
          void analytics.refetch()
          void summary.refetch()
        }}
      />
    )
  }

  if (!analytics.data || !summary.data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label={t('studyStatisticsCard.currentStreakLabel')}
        value={t('studyStatisticsCard.currentStreakValue', {
          count: summary.data.streak.current,
        })}
        icon={Flame}
      />
      <StatCard
        label={t('studyStatisticsCard.overallAccuracyLabel')}
        value={t('studyStatisticsCard.overallAccuracyValue', {
          percent: analytics.data.overallAccuracy,
        })}
        icon={CheckCircle2}
      />
      <StatCard
        label={t('studyStatisticsCard.questionsAttemptedLabel')}
        value={analytics.data.totalQuestionsAttempted.toLocaleString('en-IN')}
        icon={Target}
      />
      <StatCard
        label={t('studyStatisticsCard.xpLabel')}
        value={summary.data.xp.toLocaleString('en-IN')}
        icon={Trophy}
      />
      <StatCard
        label={t('studyStatisticsCard.coinsLabel')}
        value={summary.data.coins.toLocaleString('en-IN')}
        icon={Coins}
      />
    </div>
  )
}
