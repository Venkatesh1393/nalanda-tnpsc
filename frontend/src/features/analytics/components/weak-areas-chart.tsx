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
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ChartContainer } from '@/components/charts/chart-container'
import { ChartTooltip } from '@/components/charts/chart-tooltip'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { getWeakAreas } from '@/services/analyticsService'
import { formatDate } from '@/utils/format-date'
import { slugify } from '@/utils/slugify'

const HEIGHT = 220

/**
 * Weak Areas (docs/Analytics.md §8) — the bottom 5 topics by accuracy, a
 * single flat chart color (never `error`/`destructive`, which would
 * visually confuse a data series with a semantic status color per
 * docs/UI_Design_System.md §17) plus a direct "Study this topic" action row
 * beneath the chart — closing the insight-to-action loop the doc calls for,
 * without abandoning the "render it as a chart" request.
 */
export function WeakAreasChart() {
  const { t } = useTranslation('analytics')
  const navigate = useNavigate()
  const {
    data: points,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'weak-areas'],
    queryFn: getWeakAreas,
  })

  return (
    <ChartContainer
      title={t('weakAreasChart.title')}
      description={t('weakAreasChart.description')}
      updatedAtLabel={points ? formatDate(new Date()) : undefined}
    >
      {isError ? (
        <ErrorState title={t('weakAreasChart.errorTitle')} onRetry={() => void refetch()} />
      ) : !points ? (
        <Skeleton className="w-full" style={{ height: HEIGHT }} />
      ) : (
        <>
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
                name={t('weakAreasChart.accuracyLabel')}
                fill="var(--chart-4)"
                radius={[0, 6, 6, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {points.slice(0, 3).map((point) => (
              <Button
                key={point.topic}
                size="sm"
                variant="outline"
                onClick={() => navigate(ROUTES.learnTopics(slugify(point.subject)))}
              >
                {t('weakAreasChart.studyButton', { topic: point.topic })}
              </Button>
            ))}
          </div>
        </>
      )}
    </ChartContainer>
  )
}
