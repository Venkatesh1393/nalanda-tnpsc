import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartTooltip } from '@/components/charts/chart-tooltip'

type TrendPoint = {
  label: string
  value: number
}

type TrendLineChartProps = {
  data: TrendPoint[]
  height?: number
  color?: string
}

/**
 * Generic score-over-time trend chart (docs/UI_Design_System.md §17,
 * docs/Analytics.md §5 Accuracy / §12 Study Time) — smooth monotone
 * interpolation (never a jagged linear line), a subtle gradient fill fading
 * to transparent beneath it, minimal single-pixel gridlines, and the custom
 * card-styled tooltip. Purely presentational — the caller supplies real
 * `{ label, value }[]` data; this component has no knowledge of what the
 * data represents (accuracy, study minutes, percentile, ...).
 */
export function TrendLineChart({
  data,
  height = 240,
  color = 'var(--chart-1)',
}: TrendLineChartProps) {
  const gradientId = useId()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="0" stroke="var(--border)" vertical={false} />
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
        <Tooltip content={(props) => <ChartTooltip {...props} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
