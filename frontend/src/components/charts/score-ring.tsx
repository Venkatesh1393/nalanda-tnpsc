import { CircularProgress } from '@/components/charts/circular-progress'

type ScoreRingProps = {
  /** 0-100. Values outside this range are clamped, never allowed to over/under-draw the ring. */
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  className?: string
}

/**
 * The signature Analytics visual (docs/UI_Design_System.md §17, §39): a
 * circular progress ring with the percentage in large tabular numerals at
 * its center. Used for Overall Analytics' percentile ring
 * (docs/Analytics.md §1) and anywhere else a single 0-100 score needs a
 * glanceable visual (e.g. syllabus completion).
 *
 * Composes the generic `CircularProgress` (charts/circular-progress.tsx)
 * with the percentile-specific centered label — for a ring with different
 * center content, use `CircularProgress` directly instead of duplicating
 * this ring-drawing logic.
 */
export function ScoreRing({
  value,
  size = 120,
  strokeWidth = 10,
  label,
  className,
}: ScoreRingProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <CircularProgress
      value={value}
      size={size}
      strokeWidth={strokeWidth}
      label={label}
      className={className}
    >
      <span className="text-heading-2 text-foreground font-bold tabular-nums">
        {Math.round(clamped)}%
      </span>
      {label && <span className="text-caption text-muted-foreground">{label}</span>}
    </CircularProgress>
  )
}
