import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type CircularProgressProps = {
  /** 0-100. Clamped, never allowed to over/under-draw the ring. */
  value: number
  size?: number
  strokeWidth?: number
  /** Centered content — a percentile numeral (see `ScoreRing`), an icon,
   * or nothing. This component only draws the ring; it has no opinion on
   * what belongs at its center. */
  children?: ReactNode
  trackColor?: string
  progressColor?: string
  label?: string
  className?: string
}

/**
 * The generic circular progress ring (docs/UI_Design_System.md §17) — plain
 * SVG, `primary` arc over a `muted` track, rounded cap. `ScoreRing`
 * (charts/score-ring.tsx) composes this with the tabular-numeral percentile
 * label; use this one directly wherever a bare ring with custom center
 * content is needed instead (e.g. syllabus-completion, a Study Time widget).
 */
export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 10,
  children,
  trackColor = 'var(--muted)',
  progressColor = 'var(--primary)',
  label,
  className,
}: CircularProgressProps) {
  const { t } = useTranslation('common')
  const clamped = Math.min(100, Math.max(0, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? t('chart.percent', { value: Math.round(clamped) })}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
