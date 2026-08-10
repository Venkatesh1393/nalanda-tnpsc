import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { GoogleLoginButton } from '@/features/auth'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField } from '@/components/form-field'
import { PasswordInput } from '@/components/inputs/password-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/use-auth'
import { loginWithEmailPassword, requestEmailOtp } from '@/services/authService'

/** Schema factories, not module-scope constants — `t` isn't available at
 * module scope (no I18nextProvider exists yet when this file is first
 * imported). Rebuilt via `useMemo(() => makeXSchema(t), [t])` so a language
 * switch mid-form produces newly-translated validation messages. */
function makeEmailCodeSchema(t: TFunction<'auth'>) {
  return z.object({
    email: z
      .string()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.emailInvalid')),
  })
}
type EmailCodeFormValues = z.infer<ReturnType<typeof makeEmailCodeSchema>>

function makeEmailPasswordSchema(t: TFunction<'auth'>) {
  return z.object({
    email: z
      .string()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.emailInvalid')),
    password: z.string().min(1, t('validation.passwordRequired')),
  })
}
type EmailPasswordFormValues = z.infer<ReturnType<typeof makeEmailPasswordSchema>>

type LocationState = { from?: { pathname: string } } | null
type LoginMethod = 'code' | 'password'

/**
 * Login (docs/UserJourney.md Screen 2, docs/Authentication.md §2-§3) —
 * Google, Email OTP (no password, the platform's default passwordless
 * path), or — added alongside per this session's explicit "add it, don't
 * replace OTP" decision — real Firebase Email/Password. The email-code tab
 * only *requests* a code here; verification happens on the shared Verify
 * Email screen (docs/OTP_Flow.md), which this hands off to. The password
 * tab authenticates directly against Firebase and establishes a Nalanda
 * session immediately, no separate verification screen needed.
 */
export function LoginPage() {
  const { t } = useTranslation('auth')
  const [rememberMe, setRememberMe] = useState(true)
  const [method, setMethod] = useState<LoginMethod>('code')
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const redirectTo = (location.state as LocationState)?.from?.pathname ?? ROUTES.dashboard

  const emailCodeSchema = useMemo(() => makeEmailCodeSchema(t), [t])
  const emailPasswordSchema = useMemo(() => makeEmailPasswordSchema(t), [t])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailCodeFormValues>({
    resolver: zodResolver(emailCodeSchema),
    defaultValues: { email: '' },
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<EmailPasswordFormValues>({
    resolver: zodResolver(emailPasswordSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: EmailCodeFormValues) {
    try {
      const { otpExpiresInSeconds } = await requestEmailOtp(values.email)
      navigate(ROUTES.verifyEmail, {
        state: {
          email: values.email,
          intent: 'login',
          rememberMe,
          redirectTo,
          otpExpiresInSeconds,
        },
      })
    } catch {
      toast.error(t('login.couldNotSendCode'), { description: t('login.pleaseTryAgain') })
    }
  }

  async function onPasswordSubmit(values: EmailPasswordFormValues) {
    try {
      const { user, accessToken } = await loginWithEmailPassword(
        values.email,
        values.password,
        rememberMe,
      )
      login(user, accessToken)
      toast.success(t('login.welcomeBack'), { description: values.email })
      navigate(user.onboardingCompleted ? redirectTo : ROUTES.onboarding, {
        replace: true,
      })
    } catch (error) {
      toast.error(t('login.couldNotLogIn'), {
        description: error instanceof Error ? error.message : t('login.pleaseTryAgain'),
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Heading variant="heading-2">{t('login.title')}</Heading>
        <Text variant="body-sm">{t('login.subtitle')}</Text>
      </div>

      <GoogleLoginButton existingUserRedirectTo={redirectTo} />

      <div className="flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <Text variant="caption">{t('login.or')}</Text>
        <div className="bg-border h-px flex-1" />
      </div>

      <Tabs value={method} onValueChange={(value) => setMethod(value as LoginMethod)}>
        <TabsList className="w-full">
          <TabsTrigger value="code">{t('login.emailCodeTab')}</TabsTrigger>
          <TabsTrigger value="password">{t('login.passwordTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="mt-4">
          <form
            onSubmit={(event) => void handleSubmit(onSubmit)(event)}
            className="flex flex-col gap-4"
          >
            <FormField
              label={t('login.emailLabel')}
              type="email"
              autoComplete="email"
              placeholder={t('login.emailPlaceholder')}
              error={errors.email?.message}
              {...register('email')}
            />

            <RememberMeToggle
              id="remember-me-code"
              checked={rememberMe}
              onCheckedChange={setRememberMe}
            />

            <Button type="submit" className="w-full" loading={isSubmitting}>
              {t('login.continueWithEmail')}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="password" className="mt-4">
          <form
            onSubmit={(event) => void handlePasswordSubmit(onPasswordSubmit)(event)}
            className="flex flex-col gap-4"
          >
            <FormField
              label={t('login.emailLabel')}
              type="email"
              autoComplete="email"
              placeholder={t('login.emailPlaceholder')}
              error={passwordErrors.email?.message}
              {...registerPassword('email')}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-password">{t('login.passwordLabel')}</Label>
              <PasswordInput
                id="login-password"
                autoComplete="current-password"
                aria-invalid={Boolean(passwordErrors.password)}
                {...registerPassword('password')}
              />
              {passwordErrors.password?.message && (
                <Text variant="body-sm" className="text-destructive">
                  {passwordErrors.password.message}
                </Text>
              )}
            </div>

            <RememberMeToggle
              id="remember-me-password"
              checked={rememberMe}
              onCheckedChange={setRememberMe}
            />

            <Button type="submit" className="w-full" loading={isPasswordSubmitting}>
              {t('login.logIn')}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <Text variant="body-sm" className="text-center">
        {t('login.newToNalanda')}{' '}
        <Link to={ROUTES.register} className="text-primary font-medium hover:underline">
          {t('login.createAccount')}
        </Link>
      </Text>

      <Text variant="caption" className="text-center">
        {t('login.troubleSigningIn')}{' '}
        <Link to={ROUTES.contact} className="hover:text-foreground hover:underline">
          {t('login.contactSupport')}
        </Link>
      </Text>
    </div>
  )
}

function RememberMeToggle({
  id,
  checked,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const { t } = useTranslation('auth')
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Label htmlFor={id} className="text-sm font-normal">
        {t('login.rememberMe')}
      </Label>
    </div>
  )
}
