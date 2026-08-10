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
import { Text } from '@/components/typography'
import { getWeeklyStudyTime } from '@/services/analyticsService'
import { formatDate } from '@/utils/format-date'

const HEIGHT = 220

/**
 * Weekly Study Time (docs/Analytics.md §12) — the one vertical-bar chart in
 * this module, since a chronological day-by-day reading is more natural
 * left-to-right than a ranked horizontal list. Effort, not performance —
 * a deliberately separate story from the accuracy/score charts around it.
 */
export function WeeklyStudyTimeChart() {
  const { t } = useTranslation('analytics')
  const {
    data: points,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'weekly-study-time'],
    queryFn: getWeeklyStudyTime,
  })

  const totalMinutes = points?.reduce((sum, p) => sum + p.minutes, 0) ?? 0
  const daysActive = points?.filter((p) => p.minutes > 0).length ?? 0

  return (
    <ChartContainer
      title={t('weeklyStudyTimeChart.title')}
      description={t('weeklyStudyTimeChart.description')}
      updatedAtLabel={points ? formatDate(new Date()) : undefined}
    >
      {isError ? (
        <ErrorState
          title={t('weeklyStudyTimeChart.errorTitle')}
          onRetry={() => void refetch()}
        />
      ) : !points ? (
        <Skeleton className="w-full" style={{ height: HEIGHT }} />
      ) : (
        <>
          <Text variant="body-sm">
            {t('weeklyStudyTimeChart.summary', {
              hours: Math.round(totalMinutes / 60),
              minutes: totalMinutes % 60,
              daysActive,
            })}
          </Text>
          <ResponsiveContainer width="100%" height={HEIGHT}>
            <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={32}
              />
              <Tooltip
                cursor={{ fill: 'var(--muted)' }}
                content={(props) => <ChartTooltip {...props} />}
              />
              <Bar
                dataKey="minutes"
                name={t('weeklyStudyTimeChart.minutesLabel')}
                fill="var(--chart-1)"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </ChartContainer>
  )
}
