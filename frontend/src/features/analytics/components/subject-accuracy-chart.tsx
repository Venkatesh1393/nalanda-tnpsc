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
import { ChartTooltip } from '@/components/charts/chart-tooltip'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { getChartColor } from '@/styles/chart-colors'
import { getSubjectAccuracy } from '@/services/analyticsService'
import { formatDate } from '@/utils/format-date'

const HEIGHT = 260

/**
 * Subject Accuracy (docs/Analytics.md §2) — horizontal bars (subject names
 * read better left-aligned than a vertical chart's rotated labels), sorted
 * weakest-to-strongest so the most actionable subject is always at the top.
 */
export function SubjectAccuracyChart() {
  const { t } = useTranslation('analytics')
  const {
    data: points,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'subject-accuracy'],
    queryFn: getSubjectAccuracy,
  })

  return (
    <ChartContainer
      title={t('subjectAccuracyChart.title')}
      description={t('subjectAccuracyChart.description')}
      updatedAtLabel={points ? formatDate(new Date()) : undefined}
    >
      {isError ? (
        <ErrorState
          title={t('subjectAccuracyChart.errorTitle')}
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
            <Bar
              dataKey="accuracy"
              name={t('subjectAccuracyChart.accuracyLabel')}
              radius={[0, 6, 6, 0]}
              maxBarSize={22}
            >
              {points.map((entry, index) => (
                <Cell key={entry.subject} fill={getChartColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
