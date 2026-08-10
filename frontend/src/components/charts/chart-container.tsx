import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Heading, Text } from '@/components/typography'
import { cn } from '@/lib/utils'

type ChartContainerProps = {
  title?: string
  description?: string
  /** Rendered top-right of the header — a date-range filter, a metric
   * toggle, etc. (docs/Analytics.md's per-chart filter controls). */
  actions?: ReactNode
  /** The "last updated" timestamp every materialized-Analytics chart
   * carries (docs/Analytics.md's data-pipeline note) — rendered small,
   * muted, bottom-right, never implying real-time freshness. */
  updatedAtLabel?: string
  children: ReactNode
  className?: string
}

/**
 * Consistent card chrome around any chart (Recharts or otherwise) — title,
 * optional description/actions, the chart itself, and an optional
 * "last updated" caption. Matches the hand-authored style already
 * established by `score-ring.tsx`/`trend-line-chart.tsx` rather than
 * introducing a second, shadcn-recipe chart-wrapping convention.
 */
export function ChartContainer({
  title,
  description,
  actions,
  updatedAtLabel,
  children,
  className,
}: ChartContainerProps) {
  const { t } = useTranslation('common')
  return (
    <Card className={cn(className)}>
      {(title ?? description ?? actions) && (
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {title && <Heading variant="heading-4">{title}</Heading>}
            {description && <Text variant="body-sm">{description}</Text>}
          </div>
          {actions}
        </CardHeader>
      )}
      <CardContent className="flex flex-col gap-2">
        {children}
        {updatedAtLabel && (
          <Text variant="caption" className="text-right">
            {t('chart.lastUpdated', { value: updatedAtLabel })}
          </Text>
        )}
      </CardContent>
    </Card>
  )
}
