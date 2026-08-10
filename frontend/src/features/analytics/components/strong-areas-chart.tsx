import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { getStrongAreas } from '@/services/analyticsService'
import { formatDate } from '@/utils/format-date'

const HEIGHT = 220

/**
 * Strong Areas (docs/Analytics.md §9) — the deliberate, equally-prominent
 * counterpart to Weak Areas: the top 5 topics by accuracy, descending. Pure
 * confidence-building — no action row here, unlike Weak Areas, since the
 * point of this chart is honest, earned reassurance, not a task list.
 */
export function StrongAreasChart() {
  const { t } = useTranslation('analytics')
  const {
    data: points,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'strong-areas'],
    queryFn: getStrongAreas,
  })

  return (
    <ChartContainer
      title={t('strongAreasChart.title')}
      description={t('strongAreasChart.description')}
      updatedAtLabel={points ? formatDate(new Date()) : undefined}
    >
      {isError ? (
        <ErrorState
          title={t('strongAreasChart.errorTitle')}
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
              domain={[0, 100]}
              stroke="var(--muted-foreground)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              unit="%"
            />
            <YAxis
              type="category"
              dataKey="topic"
              stroke="var(--muted-foreground)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={150}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)' }}
              content={(props) => <ChartTooltip {...props} />}
            />
            <Bar
              dataKey="accuracy"
              name={t('strongAreasChart.accuracyLabel')}
              fill="var(--chart-2)"
              radius={[0, 6, 6, 0]}
              maxBarSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
