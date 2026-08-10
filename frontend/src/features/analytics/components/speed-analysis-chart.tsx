import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'

import { ChartContainer } from '@/components/charts/chart-container'
import { ChartTooltip } from '@/components/charts/chart-tooltip'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { getSpeedAnalysis } from '@/services/analyticsService'
import { formatDate } from '@/utils/format-date'

const HEIGHT = 260

/**
 * Speed Analysis (docs/Analytics.md §6) — the user's own average
 * time-per-question against a cohort benchmark, per subject, as two bars
 * side by side rather than overlapping, so the comparison is unambiguous.
 * A subject where "yours" is notably higher than the benchmark isn't
 * inherently bad (it may reflect careful accuracy) — no semantic
 * error/warning color is used here for that reason.
 */
export function SpeedAnalysisChart() {
  const { t } = useTranslation('analytics')
  const {
    data: points,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'speed-analysis'],
    queryFn: getSpeedAnalysis,
  })

  return (
    <ChartContainer
      title={t('speedAnalysisChart.title')}
      description={t('speedAnalysisChart.description')}
      updatedAtLabel={points ? formatDate(new Date()) : undefined}
    >
      {isError ? (
        <ErrorState
          title={t('speedAnalysisChart.errorTitle')}
          onRetry={() => void refetch()}
        />
      ) : !points ? (
        <Skeleton className="w-full" style={{ height: HEIGHT }} />
      ) : (
        <ResponsiveContainer width="100%" height={HEIGHT}>
          <BarChart
            data={points}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="0"
              stroke="var(--border)"
              horizontal={false}
            />
            <XAxis
              type="number"
              stroke="var(--muted-foreground)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              unit="s"
            />
            <YAxis
              type="category"
              dataKey="subject"
              stroke="var(--muted-foreground)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={110}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)' }}
              content={(props) => <ChartTooltip {...props} />}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => (
                <span className="text-muted-foreground">{value}</span>
              )}
            />
            <Bar
              dataKey="yourSeconds"
              name={t('speedAnalysisChart.yourLabel')}
              fill="var(--chart-1)"
              radius={[0, 4, 4, 0]}
              maxBarSize={14}
            />
            <Bar
              dataKey="benchmarkSeconds"
              name={t('speedAnalysisChart.cohortLabel')}
              fill="var(--chart-3)"
              radius={[0, 4, 4, 0]}
              maxBarSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
