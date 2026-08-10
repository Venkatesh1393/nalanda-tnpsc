import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'

import { ChartContainer } from '@/components/charts/chart-container'
import { getChartColor } from '@/styles/chart-colors'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { getPracticeHistory } from '@/services/analyticsService'
import { formatDate } from '@/utils/format-date'
import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { PracticeHistoryPoint } from '@/types/analytics'

const HEIGHT = 240

/** A custom tooltip (rather than the shared `ChartTooltip`) since this
 * chart's most useful context — which mode a session was — lives in the
 * data point itself, not in a second series. */
function PracticeHistoryTooltip({
  active,
  payload,
  label,
}: TooltipContentProps<ValueType, NameType>) {
  const { t } = useTranslation('analytics')
  if (!active || !payload?.length) return null
  const point = payload[0].payload as PracticeHistoryPoint

  return (
    <div className="bg-popover text-popover-foreground border-border rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground mb-1 text-xs font-medium">{label}</p>
      <p className="font-medium">{point.mode}</p>
      <p className="tabular-nums">
        {t('practiceHistoryChart.tooltipScore', { value: point.scorePercent })}
      </p>
    </div>
  )
}

/**
 * Practice History — score per recent session, chronological. Distinct
 * from Weekly Study Time (effort) and Monthly Progress (overall trend):
 * this is the raw per-session performance record across every Practice
 * mode (docs/Smart_Practice.md), the most direct "am I actually improving
 * session to session" view.
 */
export function PracticeHistoryChart() {
  const { t } = useTranslation('analytics')
  const {
    data: points,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'practice-history'],
    queryFn: getPracticeHistory,
  })

  return (
    <ChartContainer
      title={t('practiceHistoryChart.title')}
      description={t('practiceHistoryChart.description')}
      updatedAtLabel={points ? formatDate(new Date()) : undefined}
    >
      {isError ? (
        <ErrorState
          title={t('practiceHistoryChart.errorTitle')}
          onRetry={() => void refetch()}
        />
      ) : !points ? (
        <Skeleton className="w-full" style={{ height: HEIGHT }} />
      ) : (
        <ResponsiveContainer width="100%" height={HEIGHT}>
          <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="0" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--muted-foreground)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              domain={[0, 100]}
              stroke="var(--muted-foreground)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={32}
              unit="%"
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)' }}
              content={(props) => <PracticeHistoryTooltip {...props} />}
            />
            <Bar
              dataKey="scorePercent"
              name={t('practiceHistoryChart.scoreSeriesName')}
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            >
              {points.map((entry, index) => (
                <Cell key={entry.label} fill={getChartColor(index % 3)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
