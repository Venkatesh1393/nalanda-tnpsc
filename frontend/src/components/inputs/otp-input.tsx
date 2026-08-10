import { forwardRef } from 'react'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Check, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { cn } from '@/lib/utils'

export type OtpInputStatus = 'default' | 'error' | 'expired' | 'success' | 'locked'

type OtpInputProps = {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  status?: OtpInputStatus
  /** Read-only (not `disabled`) while a verify request is in flight
   * (docs/OTP_Flow.md §8) — keeps the box focused throughout the request,
   * unlike the terminal `disabled` states below (locked out, already
   * verified), which have no reason to ever regain focus. */
  verifying?: boolean
  disabled?: boolean
  /** Focus the first box the instant this mounts (docs/OTP_Flow.md §2) —
   * opt-in rather than default-on so unrelated previews (e.g. `App.tsx`'s
   * design-system screen, which renders several `OtpInput`s side by side)
   * don't fight each other for focus on load. */
  autoFocus?: boolean
  className?: string
}

/**
 * The 6-digit segmented OTP input (docs/OTP_Flow.md) — auto-advance,
 * backspace-to-previous, and paste-distribute-across-boxes all come free
 * from the underlying `input-otp` library, which is exactly what it's built
 * for; `pattern={REGEXP_ONLY_DIGITS}` restricts entry to numeric characters
 * and `autoComplete="one-time-code"` opts into the OS/browser's native
 * "use code from email/SMS" autofill suggestion. This wrapper adds
 * Nalanda's specific per-status treatment on top: a shake + red flash on
 * `error`, a calm fade on `expired` (never a shake — expiry isn't the
 * user's fault, per docs/OTP_Flow.md §7), a muted padlock overlay on
 * `locked` (§6's 5th-attempt lockout), and a restrained checkmark draw-in
 * on `success` (§9 — deliberately not the platform's celebratory motion,
 * since this is an account-security step, not a learning milestone).
 */
export const OtpInput = forwardRef<HTMLInputElement, OtpInputProps>(function OtpInput(
  {
    length = 6,
    value,
    onChange,
    onComplete,
    status = 'default',
    verifying = false,
    disabled = false,
    autoFocus = false,
    className,
  },
  ref,
) {
  const { t } = useTranslation('auth')
  const isInert = disabled || status === 'success' || status === 'locked'

  return (
    <div
      className={cn(
        'relative inline-flex',
        status === 'error' && 'animate-shake',
        status === 'expired' && 'animate-in fade-in duration-300',
        className,
      )}
    >
      <InputOTP
        ref={ref}
        maxLength={length}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        readOnly={verifying}
        disabled={isInert}
        autoFocus={autoFocus}
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern={REGEXP_ONLY_DIGITS}
        aria-invalid={status === 'error'}
        aria-label={t('otpInput.ariaLabel')}
      >
        <InputOTPGroup>
          {Array.from({ length }).map((_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              className={cn(
                // 44px is the design system's mobile touch-target floor
                // (docs/UI_Design_System.md §31), applied only under an
                // actual finger via `pointer-coarse:` so compact
                // mouse/trackpad sizing on desktop is untouched.
                'size-10 text-base sm:size-11 pointer-coarse:size-11',
                status === 'error' && 'border-destructive text-destructive',
                status === 'success' && 'border-success',
                status === 'locked' && 'text-muted-foreground grayscale',
              )}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {status === 'success' && (
        <span
          className="bg-background/90 animate-in fade-in zoom-in-50 absolute inset-0 flex items-center justify-center duration-300"
          aria-hidden="true"
        >
          <Check className="text-success size-6" />
        </span>
      )}
      {status === 'locked' && (
        <span
          className="bg-background/80 absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <Lock className="text-muted-foreground size-5" />
        </span>
      )}
    </div>
  )
})
