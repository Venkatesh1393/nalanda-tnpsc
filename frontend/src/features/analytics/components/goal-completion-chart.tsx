import { useQuery } from '@tanstack/react-query'
import { RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
import { useTranslation } from 'react-i18next'

import { ChartContainer } from '@/components/charts/chart-container'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import { getGoalCompletion } from '@/services/analyticsService'
import { formatDate } from '@/utils/format-date'

const HEIGHT = 200

/**
 * Goal Completion — progress toward the user's active exam goal, rendered
 * as a Recharts `RadialBarChart` (a single track + progress bar bent into
 * a ring) so this chart shares the same Recharts foundation as the rest of
 * the module, with a centered tabular-numeral percentage overlaid the same
 * way `charts/circular-progress.tsx` centers its own content.
 */
export function GoalCompletionChart() {
  const { t } = useTranslation('analytics')
  const { data, isError, refetch } = useQuery({
    queryKey: ['analytics', 'goal-completion'],
    queryFn: getGoalCompletion,
  })

  return (
    <ChartContainer
      title={t('goalCompletionChart.title')}
      description={
        data ? t('goalCompletionChart.description', { exam: data.examLabel }) : undefined
      }
      updatedAtLabel={data ? formatDate(new Date()) : undefined}
    >
      {isError ? (
        <ErrorState
          title={t('goalCompletionChart.errorTitle')}
          onRetry={() => void refetch()}
        />
      ) : !data ? (
        <Skeleton className="w-full" style={{ height: HEIGHT }} />
      ) : (
        <>
          <div className="relative" style={{ height: HEIGHT }}>
            <ResponsiveContainer width="100%" height={HEIGHT}>
              <RadialBarChart
                data={[
                  { name: 'Goal', value: data.percentComplete, fill: 'var(--chart-1)' },
                ]}
                innerRadius="72%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                barSize={16}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={999}
                  background={{ fill: 'var(--muted)' }}
                  isAnimationActive={false}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-heading-2 text-foreground font-bold tabular-nums">
                {data.percentComplete}%
              </span>
              <Text variant="caption">{t('goalCompletionChart.completeLabel')}</Text>
            </div>
          </div>
          <Text variant="body-sm" className="text-center">
            {t('goalCompletionChart.daysUntil', {
              days: data.daysRemaining,
              date: formatDate(data.targetDate),
            })}
          </Text>
        </>
      )}
    </ChartContainer>
  )
}
