import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Text } from '@/components/typography'
import { usePracticeTimer } from '@/features/practice/hooks/use-practice-timer'
import { cn } from '@/lib/utils'
import type { TimerType } from '@/types/practice'

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

type QuestionTimerProps = {
  timerType: TimerType
  durationSeconds: number
  startedAt: string
  isActive: boolean
  onExpire?: () => void
  className?: string
}

/**
 * The visible countdown/count-up (docs/Smart_Practice.md §2) — tabular
 * numerals throughout. Hard timers shift calm `text-primary` ->
 * `text-warning` in the final 10% of the budget -> `text-destructive` in
 * the final minute, a gradual escalation rather than a sudden jump. Soft
 * timers never change color or imply urgency — there's no such thing as
 * "running out" on a soft-timer session.
 */
export function QuestionTimer({
  timerType,
  durationSeconds,
  startedAt,
  isActive,
  onExpire,
  className,
}: QuestionTimerProps) {
  const { t } = useTranslation('practice')
  const { elapsedSeconds, remainingSeconds, percentRemaining } = usePracticeTimer({
    timerType,
    durationSeconds,
    startedAt,
    isActive,
    onExpire,
  })

  const isSoft = timerType === 'soft'
  const displaySeconds = isSoft ? elapsedSeconds : (remainingSeconds ?? 0)
  const isFinalMinute = !isSoft && remainingSeconds !== null && remainingSeconds <= 60
  const isFinalTenPercent = !isSoft && percentRemaining !== null && percentRemaining <= 10

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 font-medium tabular-nums',
        isSoft
          ? 'text-primary'
          : isFinalMinute
            ? 'text-destructive'
            : isFinalTenPercent
              ? 'text-warning'
              : 'text-primary',
        className,
      )}
      role="timer"
      aria-label={
        isSoft ? t('questionTimer.timeElapsed') : t('questionTimer.timeRemaining')
      }
    >
      <Clock className="size-4" aria-hidden="true" />
      <Text as="span" variant="body-md" className="font-medium text-inherit tabular-nums">
        {formatDuration(displaySeconds)}
      </Text>
    </div>
  )
}
