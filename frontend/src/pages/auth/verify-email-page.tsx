import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { OtpVerificationForm } from '@/features/auth'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/use-auth'
import type { AuthIntent, AuthUser } from '@/types/auth'

type VerifyEmailState = {
  email: string
  intent: AuthIntent
  rememberMe?: boolean
  redirectTo?: string
  otpExpiresInSeconds: number
} | null

/**
 * Verify Email — the shared OTP-entry screen (docs/OTP_Flow.md) reached
 * from both Login and Register. Requires router state (set by whichever
 * page navigated here); landing here directly with none means there's
 * nothing to verify, so it bounces back to Login rather than rendering a
 * broken "verify undefined" screen.
 */
export function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const state = location.state as VerifyEmailState

  if (!state?.email) {
    return <Navigate to={ROUTES.login} replace />
  }

  const { email, intent, redirectTo = ROUTES.dashboard } = state

  function handleVerified(user: AuthUser, accessToken: string) {
    login(user, accessToken)
    toast.success(
      intent === 'register' ? t('verifyEmail.accountVerified') : t('verifyEmail.welcomeBack'),
      { description: email },
    )
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Heading variant="heading-2">{t('verifyEmail.title')}</Heading>
        <Text variant="body-sm">
          {t('verifyEmail.subtitle')}{' '}
          <span className="text-foreground font-medium">{email}</span>
        </Text>
      </div>

      <OtpVerificationForm
        email={email}
        initialExpiresInSeconds={state.otpExpiresInSeconds}
        onVerified={handleVerified}
      />
    </div>
  )
}
