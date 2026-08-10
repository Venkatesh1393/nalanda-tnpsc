import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { ChartContainer } from '@/components/charts/chart-container'
import { TrendLineChart } from '@/components/charts/trend-line-chart'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import { getMonthlyProgress } from '@/services/analyticsService'
import { formatDate } from '@/utils/format-date'

const HEIGHT = 240

/**
 * Monthly Progress — overall exam-readiness trend over the last several
 * months, reusing the existing `TrendLineChart` (smooth gradient-fill area,
 * docs/UI_Design_System.md §17) rather than a new chart type — the same
 * component the Dashboard's Weekly Progress widget already uses, just
 * scoped to months instead of days.
 */
export function MonthlyProgressChart() {
  const { t } = useTranslation('analytics')
  const {
    data: points,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'monthly-progress'],
    queryFn: getMonthlyProgress,
  })

  const latest = points?.at(-1)
  const first = points?.at(0)
  const gained = latest && first ? latest.percent - first.percent : 0

  return (
    <ChartContainer
      title={t('monthlyProgressChart.title')}
      description={t('monthlyProgressChart.description')}
      updatedAtLabel={points ? formatDate(new Date()) : undefined}
    >
      {isError ? (
        <ErrorState
          title={t('monthlyProgressChart.errorTitle')}
          onRetry={() => void refetch()}
        />
      ) : !points ? (
        <Skeleton className="w-full" style={{ height: HEIGHT }} />
      ) : (
        <>
          <Text variant="body-sm">
            {gained > 0
              ? t('monthlyProgressChart.summaryGained', {
                  gained,
                  since: first?.label,
                  percent: latest?.percent,
                })
              : t('monthlyProgressChart.summarySteady', {
                  since: first?.label,
                  percent: latest?.percent,
                })}
          </Text>
          <TrendLineChart
            data={points.map((p) => ({ label: p.label, value: p.percent }))}
            height={HEIGHT}
            color="var(--chart-2)"
          />
        </>
      )}
    </ChartContainer>
  )
}
