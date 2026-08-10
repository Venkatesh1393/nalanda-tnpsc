import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Flame, Target, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/stat-card'
import { getAnalyticsSummary } from '@/services/analyticsService'

/**
 * The dashboard's glanceable opener — four plain stat tiles (no chart, per
 * `components/stat-card.tsx`'s own convention), giving the 9 charts below a
 * top-level "so where do I actually stand" summary before the detail.
 */
export function AnalyticsSummaryRow() {
  const { t } = useTranslation('analytics')
  const { data } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: getAnalyticsSummary,
  })

  if (!data) {
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
        label={t('analyticsSummaryRow.overallPercentile.label')}
        value={t('analyticsSummaryRow.overallPercentile.value', {
          value: data.overallPercentile,
        })}
        icon={TrendingUp}
      />
      <StatCard
        label={t('analyticsSummaryRow.overallAccuracy.label')}
        value={t('analyticsSummaryRow.overallAccuracy.value', { value: data.overallAccuracy })}
        icon={CheckCircle2}
      />
      <StatCard
        label={t('analyticsSummaryRow.questionsAttempted.label')}
        value={data.totalQuestionsAttempted.toLocaleString('en-IN')}
        icon={Target}
      />
      <StatCard
        label={t('analyticsSummaryRow.currentStreak.label')}
        value={t('analyticsSummaryRow.currentStreak.value', { value: data.currentStreak })}
        icon={Flame}
      />
    </div>
  )
}
