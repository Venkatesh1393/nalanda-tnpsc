import { useEffect, useMemo, useRef, useState } from 'react'

import type { TimerType } from '@/types/practice'

type UsePracticeTimerOptions = {
  timerType: TimerType
  /** Total time budget in seconds. */
  durationSeconds: number
  /** ISO timestamp the session actually started — elapsed time is always
   * computed from this, not accumulated client-side, so time away from the
   * tab/app while a hard-timer session is open still counts against the
   * timer on return (docs/UserJourney.md Screen 7's edge case). */
  startedAt: string
  /** Stops ticking once the session is submitted. */
  isActive: boolean
  /** Hard-timer only — fires once, the moment the countdown reaches zero. */
  onExpire?: () => void
}

/**
 * Drives both timer behaviors from docs/Smart_Practice.md §2: a soft timer
 * (Topic Quiz/100 Questions) just counts elapsed time up, forever, with no
 * concept of "running out"; a hard timer (Sectional/Mock/PYQ) counts down
 * from `durationSeconds` and calls `onExpire` once at zero.
 */
export function usePracticeTimer({
  timerType,
  durationSeconds,
  startedAt,
  isActive,
  onExpire,
}: UsePracticeTimerOptions) {
  const startedAtMs = useMemo(() => new Date(startedAt).getTime(), [startedAt])
  const computeElapsed = () => Math.max(0, Math.round((Date.now() - startedAtMs) / 1000))
  const [elapsedSeconds, setElapsedSeconds] = useState(computeElapsed)
  const expiredFiredRef = useRef(false)

  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAtMs) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [isActive, startedAtMs])

  const remainingSeconds =
    timerType === 'hard' ? Math.max(0, durationSeconds - elapsedSeconds) : null

  useEffect(() => {
    if (timerType !== 'hard' || !isActive) return
    if (remainingSeconds === 0 && !expiredFiredRef.current) {
      expiredFiredRef.current = true
      onExpire?.()
    }
    // onExpire intentionally excluded — see hooks/use-mock-video-player.ts
    // for the same accepted pattern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, timerType, isActive])

  const percentRemaining =
    timerType === 'hard' && durationSeconds > 0
      ? ((remainingSeconds ?? 0) / durationSeconds) * 100
      : null

  return { elapsedSeconds, remainingSeconds, percentRemaining }
}
