import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { OtpInput, type OtpInputStatus } from '@/components/inputs/otp-input'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/typography'
import {
  AuthMockError,
  MOCK_EXPIRY_WARNING_SECONDS,
  MOCK_LOCKOUT_SECONDS,
  MOCK_MAX_OTP_ATTEMPTS,
  MOCK_OTP_TTL_SECONDS,
  MOCK_RESEND_COOLDOWN_SECONDS,
  resendEmailOtp,
  verifyEmailOtp,
} from '@/services/authService'
import type { AuthUser } from '@/types/auth'

type FormStatus = 'default' | 'error' | 'expired' | 'success' | 'network-error'

type OtpVerificationFormProps = {
  email: string
  initialExpiresInSeconds: number
  onVerified: (user: AuthUser, accessToken: string) => void
}

// docs/OTP_Flow.md §8 — a hard backstop so a verify request never spins
// indefinitely; falls through to the same treatment as any other
// network/server failure.
const VERIFY_TIMEOUT_MS = 8_000
// Held just long enough to register as a positive confirmation before
// advancing (docs/OTP_Flow.md §9 — 400-500ms, deliberately restrained
// rather than the platform's celebratory motion, since this is an
// account-security step, not a learning milestone).
const SUCCESS_HOLD_MS = 450

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('TIMEOUT')), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

/**
 * The OTP-entry screen's interactive core (docs/OTP_Flow.md) — segmented
 * input, dual-trigger verify (auto-submit on the 6th digit + an explicit
 * button for accessibility, §8), three visually distinct outcomes for a
 * failed submission (wrong-code shake, expired-code calm fade, network/
 * server error with the entered code preserved — §6/§7/§10), a resend
 * cooldown that's bypassed immediately after an expired submission (§4),
 * and a lockout after 5 wrong attempts with **no remaining-attempts count
 * shown** (§6's anti-enumeration decision). All client-side timing here is
 * UX only — the doc is explicit that real enforcement is 100% server-side
 * (§11); this mock stands in for that server until the backend exists.
 */
export function OtpVerificationForm({
  email,
  initialExpiresInSeconds,
  onVerified,
}: OtpVerificationFormProps) {
  const { t } = useTranslation('auth')
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState<FormStatus>('default')
  const [verifying, setVerifying] = useState(false)
  const [autoTriggered, setAutoTriggered] = useState(false)
  const [resending, setResending] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [expiresAt, setExpiresAt] = useState(
    () => Date.now() + initialExpiresInSeconds * 1000,
  )
  const [resendAvailableAt, setResendAvailableAt] = useState(
    () => Date.now() + MOCK_RESEND_COOLDOWN_SECONDS * 1000,
  )
  const [now, setNow] = useState(() => Date.now())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const isLocked = lockedUntil !== null && now < lockedUntil
  const resendSecondsLeft = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000))
  const lockoutSecondsLeft = lockedUntil
    ? Math.max(0, Math.ceil((lockedUntil - now) / 1000))
    : 0
  const secondsUntilExpiry = Math.max(0, Math.ceil((expiresAt - now) / 1000))
  const showExpiryWarning =
    status === 'default' &&
    !isLocked &&
    secondsUntilExpiry > 0 &&
    secondsUntilExpiry <= MOCK_EXPIRY_WARNING_SECONDS

  async function handleVerify(code: string, trigger: 'auto' | 'manual') {
    if (isLocked || verifying || status === 'success') return

    // Expiry is only ever discovered at submission time (docs/OTP_Flow.md
    // §7) — never by pre-emptively disabling the boxes while a countdown
    // silently runs out underneath the user.
    if (Date.now() >= expiresAt) {
      setStatus('expired')
      setOtp('')
      // §4 — an expired submission bypasses the normal resend cooldown
      // entirely; the user isn't abusing resend, they're recovering from a
      // timeout that wasn't their fault.
      setResendAvailableAt(Date.now())
      return
    }

    setVerifying(true)
    setAutoTriggered(trigger === 'auto')
    try {
      const { user, accessToken } = await withTimeout(
        verifyEmailOtp(email, code),
        VERIFY_TIMEOUT_MS,
      )
      setStatus('success')
      window.setTimeout(() => onVerified(user, accessToken), SUCCESS_HOLD_MS)
    } catch (error) {
      if (error instanceof AuthMockError) {
        const nextAttempts = attempts + 1
        setAttempts(nextAttempts)
        setOtp('')

        if (nextAttempts >= MOCK_MAX_OTP_ATTEMPTS) {
          setLockedUntil(Date.now() + MOCK_LOCKOUT_SECONDS * 1000)
          setStatus('default')
          toast.error(t('otp.tooManyAttemptsToast'), {
            description: t('otp.waitThenRequest', { seconds: MOCK_LOCKOUT_SECONDS }),
          })
        } else {
          setStatus('error')
          toast.error(error.message)
          inputRef.current?.focus()
        }
      } else {
        // Network/server error (§10) — never the user's fault, so the code
        // they already entered is preserved rather than cleared, and there's
        // no shake — the code was never actually proven wrong, only
        // unreachable.
        setStatus('network-error')
        toast.error(t('otp.connectionProblem'), {
          description: t('otp.couldNotVerifyCheckConnection'),
        })
      }
    } finally {
      setVerifying(false)
    }
  }

  function handleOtpChange(value: string) {
    setOtp(value)
    if (status === 'error' || status === 'network-error' || status === 'expired') {
      setStatus('default')
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      const { cooldownSeconds } = await resendEmailOtp(email)
      setResendAvailableAt(Date.now() + cooldownSeconds * 1000)
      setExpiresAt(Date.now() + MOCK_OTP_TTL_SECONDS * 1000)
      setStatus('default')
      setAttempts(0)
      setLockedUntil(null)
      setOtp('')
      toast.success(t('otp.newCodeSent'), { description: t('otp.sentTo', { email }) })
      inputRef.current?.focus()
    } catch {
      toast.error(t('otp.couldNotResend'), { description: t('otp.pleaseTryAgain') })
    } finally {
      setResending(false)
    }
  }

  const otpInputStatus: OtpInputStatus = isLocked
    ? 'locked'
    : status === 'network-error'
      ? 'default'
      : status

  return (
    <div className="flex flex-col items-center gap-4">
      <OtpInput
        ref={inputRef}
        value={otp}
        onChange={handleOtpChange}
        onComplete={(code) => void handleVerify(code, 'auto')}
        status={otpInputStatus}
        verifying={verifying}
        autoFocus
      />

      {verifying && autoTriggered && (
        <div
          className="bg-muted h-1 w-32 overflow-hidden rounded-full"
          aria-hidden="true"
        >
          <div className="bg-primary animate-otp-progress h-full w-1/3 rounded-full" />
        </div>
      )}

      <div className="min-h-4 text-center" role="status" aria-live="polite">
        {verifying ? (
          <Text variant="body-sm" className="text-muted-foreground">
            {t('otp.verifying')}
          </Text>
        ) : isLocked ? (
          <Text variant="body-sm" className="text-destructive">
            {t('otp.tooManyAttempts')}
          </Text>
        ) : status === 'network-error' ? (
          <Text variant="body-sm" className="text-destructive">
            {t('otp.networkErrorPrefix')}{' '}
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              onClick={() => void handleVerify(otp, 'manual')}
            >
              {t('otp.retry')}
            </button>
            .
          </Text>
        ) : status === 'expired' ? (
          <Text variant="body-sm" className="text-muted-foreground">
            {t('otp.expired')}
          </Text>
        ) : status === 'error' ? (
          <Text variant="body-sm" className="text-destructive">
            {t('otp.incorrect')}
          </Text>
        ) : showExpiryWarning ? (
          <Text variant="body-sm" className="text-warning">
            {t('otp.expiresSoon')}
          </Text>
        ) : null}
      </div>

      <Button
        type="button"
        className="w-full"
        loading={verifying && !autoTriggered}
        disabled={otp.length < 6 || isLocked || verifying || status === 'success'}
        onClick={() => void handleVerify(otp, 'manual')}
      >
        {t('otp.verify')}
      </Button>

      <div className="flex items-center gap-1.5">
        <Text variant="body-sm">{t('otp.didntGetCode')}</Text>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          disabled={isLocked || resendSecondsLeft > 0}
          loading={resending}
          onClick={() => void handleResend()}
        >
          {isLocked
            ? t('otp.requestNewCodeIn', { seconds: lockoutSecondsLeft })
            : resendSecondsLeft > 0
              ? t('otp.resendIn', { seconds: resendSecondsLeft })
              : t('otp.resendCode')}
        </Button>
      </div>
    </div>
  )
}
