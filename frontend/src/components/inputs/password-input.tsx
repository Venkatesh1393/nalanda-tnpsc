import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * A generic, reusable password field. Originally written for the one
 * password field `docs/Registration_Flow.md` §6.4 documents (the
 * institutional staff-invite "Set Your Password" screen) — the platform's
 * default identity paths (Google, Email OTP) remain passwordless per
 * docs/Authentication.md. Now also used by the real Firebase Email/Password
 * option added *alongside* those defaults (Login/Register pages), per this
 * session's explicit "add it, don't replace passwordless" decision.
 */
export function PasswordInput({ className, ...props }: ComponentProps<typeof Input>) {
  const { t } = useTranslation('common')
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pr-9', className)}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? t('a11y.hidePassword') : t('a11y.showPassword')}
        aria-pressed={visible}
        onClick={() => setVisible((prev) => !prev)}
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
