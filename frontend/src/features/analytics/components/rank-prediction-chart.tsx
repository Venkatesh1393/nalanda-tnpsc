import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis } from 'recharts'
import { useTranslation } from 'react-i18next'

import { ChartContainer } from '@/components/charts/chart-container'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import { getRankPrediction } from '@/services/analyticsService'
import { formatDate } from '@/utils/format-date'

const HEIGHT = 220

/**
 * Rank Prediction (docs/Analytics.md §11) — a bell-curve distribution with
 * the user's position marked, communicating not just the percentile number
 * but *where on the competitive spectrum* it sits. Distinct from Goal
 * Completion/Monthly Progress: this is relative standing among other
 * aspirants, not an absolute score.
 */
export function RankPredictionChart() {
  const { t } = useTranslation('analytics')
  const { data, isError, refetch } = useQuery({
    queryKey: ['analytics', 'rank-prediction'],
    queryFn: getRankPrediction,
  })

  return (
    <ChartContainer
      title={t('rankPredictionChart.title')}
      description={t('rankPredictionChart.description')}
      updatedAtLabel={data ? formatDate(new Date()) : undefined}
    >
      {isError ? (
        <ErrorState
          title={t('rankPredictionChart.errorTitle')}
          onRetry={() => void refetch()}
        />
      ) : !data ? (
        <Skeleton className="w-full" style={{ height: HEIGHT }} />
      ) : (
        <>
          <Text variant="body-sm">
            <span className="text-foreground font-medium tabular-nums">
              {t('rankPredictionChart.percentileLabel', { value: data.percentile })}
            </span>{' '}
            {t('rankPredictionChart.rankOf', {
              rank: data.rankEstimate.toLocaleString('en-IN'),
              cohort: data.cohortSize.toLocaleString('en-IN'),
            })}
          </Text>
          {data.isSmallCohort && (
            <Text variant="caption">{t('rankPredictionChart.smallCohortNote')}</Text>
          )}
          <ResponsiveContainer width="100%" height={HEIGHT}>
            <AreaChart
              data={data.curve}
              margin={{ top: 16, right: 16, bottom: 0, left: 16 }}
            >
              <defs>
                <linearGradient id="rank-curve-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="percentile"
                stroke="var(--muted-foreground)"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                unit="%"
              />
              <Area
                type="monotone"
                dataKey="density"
                stroke="var(--chart-3)"
                strokeWidth={2}
                fill="url(#rank-curve-fill)"
                isAnimationActive={false}
              />
              <ReferenceLine
                x={data.percentile}
                stroke="var(--primary)"
                strokeWidth={2}
                label={{
                  value: t('rankPredictionChart.youLabel'),
                  position: 'top',
                  fill: 'var(--primary)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
    </ChartContainer>
  )
}
