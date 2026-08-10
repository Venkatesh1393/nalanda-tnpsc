import type { TFunction } from 'i18next'
import { Clock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '@/components/typography'
import { cn } from '@/lib/utils'

function formatRemaining(ms: number, t: TFunction<'liveExams'>): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) return t('countdown.daysHoursMinutes', { days, hours, minutes })
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

type CountdownProps = {
  /** The moment to count down to (ISO). */
  targetIso: string
  /** Server clock at the time the data was fetched (ISO) — used to correct
   * for client/server clock skew (Step 48's "server time is authoritative"
   * rule), so the countdown reflects the server's notion of "now," not the
   * student's possibly-wrong device clock. Omit only when no fetch response
   * carried one (falls back to trusting the client clock — never call
   * `Date.now()`/`new Date()` inline at a call site just to fill this in,
   * that's an impure value computed during render). */
  serverTimeIso?: string
  onComplete?: () => void
  className?: string
}

/**
 * A live-ticking countdown, synced against server time at mount (one-time
 * offset correction, then a local 1s interval — no per-second polling).
 * Fires `onComplete` exactly once when it reaches zero.
 */
export function Countdown({
  targetIso,
  serverTimeIso,
  onComplete,
  className,
}: CountdownProps) {
  const { t } = useTranslation('liveExams')
  const [clockOffsetMs] = useState(() =>
    serverTimeIso ? Date.now() - new Date(serverTimeIso).getTime() : 0,
  )
  const targetMs = new Date(targetIso).getTime()
  const [remainingMs, setRemainingMs] = useState(
    () => targetMs - (Date.now() - clockOffsetMs),
  )

  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    const tick = () => {
      const next = targetMs - (Date.now() - clockOffsetMs)
      setRemainingMs(next)
      if (next <= 0 && !firedRef.current) {
        firedRef.current = true
        onCompleteRef.current?.()
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [targetMs, clockOffsetMs])

  return (
    <div className={cn('flex items-center gap-1.5 font-medium tabular-nums', className)}>
      <Clock className="size-4" aria-hidden="true" />
      <Text as="span" variant="body-md" className="font-medium tabular-nums">
        {formatRemaining(remainingMs, t)}
      </Text>
    </div>
  )
}
