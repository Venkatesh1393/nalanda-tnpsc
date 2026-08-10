import { TrendingDown, TrendingUp } from 'lucide-react'
import type { ComponentProps, ComponentType, SVGProps } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { Text } from '@/components/typography'
import { cn } from '@/lib/utils'

type StatCardProps = ComponentProps<typeof Card> & {
  label: string
  /** Pre-formatted so this component stays unopinionated about units
   * ("78%", "1,204", "12 days"). */
  value: string
  /** Any Lucide icon or Nalanda-custom SVG glyph (e.g. `StreakFlameIcon`) —
   * intentionally wider than lucide-react's own `LucideIcon` type so both
   * families are accepted without a cast at the call site. */
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  /** Positive shows an upward trend in `success`, negative a downward trend
   * in `destructive` — the sign of the number decides the direction, so
   * callers never pass a separate "direction" flag that could disagree with it. */
  trend?: number
  /** Renders even without `trend` (e.g. Dashboard's Rank tile: "#412 of
   * 2,280" with no numeric delta) — only the leading `+N` sign/value is
   * gated on `trend` being defined; the caption itself isn't. */
  trendLabel?: string
}

/**
 * The Dashboard/Analytics stat tile (docs/UserJourney.md Screen 5,
 * docs/Analytics.md §1) — a number, a label, and an optional trend
 * indicator. Deliberately plain (no chart) — for a visual 0-100 score, use
 * `charts/circular-progress.tsx` or `charts/score-ring.tsx` instead.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  className,
  ...props
}: StatCardProps) {
  const isPositive = trend !== undefined && trend > 0
  const isNegative = trend !== undefined && trend < 0

  return (
    <Card className={cn(className)} {...props}>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Text variant="overline">{label}</Text>
          <span className="text-heading-1 text-foreground font-bold tabular-nums">
            {value}
          </span>
          {(trend !== undefined || trendLabel) && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
                isPositive && 'text-success',
                isNegative && 'text-destructive',
                !isPositive && !isNegative && 'text-muted-foreground',
              )}
            >
              {isPositive && <TrendingUp className="size-3.5" aria-hidden="true" />}
              {isNegative && <TrendingDown className="size-3.5" aria-hidden="true" />}
              {trend !== undefined && (trend > 0 ? '+' : '')}
              {trend !== undefined && trend}
              {trendLabel ? (trend !== undefined ? ` ${trendLabel}` : trendLabel) : ''}
            </span>
          )}
        </div>
        {Icon && (
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        )}
      </CardContent>
    </Card>
  )
}
