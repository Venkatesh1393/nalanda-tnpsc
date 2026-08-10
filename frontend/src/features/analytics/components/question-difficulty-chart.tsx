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
import { getDifficultyAnalytics } from '@/services/analyticsService'
import { formatDate } from '@/utils/format-date'

const HEIGHT = 200
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard']

/**
 * Question Difficulty — accuracy broken down by Easy/Medium/Hard, a new,
 * additive chart (Sprint 3 Step 47 §8) rather than a redesign of any
 * existing view. Only difficulty bands with enough attempts are returned by
 * the backend at all (`analytics.service.ts`'s classification-minimum
 * rule), so an empty response here means "not enough data yet across any
 * band," not a bug.
 */
export function QuestionDifficultyChart() {
  const { t } = useTranslation(['common', 'analytics'])
  const DIFFICULTY_LABEL: Record<string, string> = {
    easy: t('common:difficulty.easy'),
    medium: t('common:difficulty.medium'),
    hard: t('common:difficulty.hard'),
  }
  const {
    data: points,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'difficulty'],
    queryFn: getDifficultyAnalytics,
  })

  const ordered = points
    ? [...points].sort(
        (a, b) =>
          DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty),
      )
    : undefined

  return (
    <ChartContainer
      title={t('analytics:questionDifficultyChart.title')}
      description={t('analytics:questionDifficultyChart.description')}
      updatedAtLabel={points ? formatDate(new Date()) : undefined}
    >
      {isError ? (
        <ErrorState
          title={t('analytics:questionDifficultyChart.errorTitle')}
          onRetry={() => void refetch()}
        />
      ) : !ordered ? (
        <Skeleton className="w-full" style={{ height: HEIGHT }} />
      ) : (
        <ResponsiveContainer width="100%" height={HEIGHT}>
          <BarChart
            data={ordered.map((point) => ({
              ...point,
              label: DIFFICULTY_LABEL[point.difficulty] ?? point.difficulty,
            }))}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
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
              content={(props) => <ChartTooltip {...props} />}
            />
            <Bar
              dataKey="accuracy"
              name={t('analytics:questionDifficultyChart.accuracyLabel')}
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            >
              {ordered.map((point, index) => (
                <Cell key={point.difficulty} fill={getChartColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
