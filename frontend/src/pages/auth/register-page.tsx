import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { ArrowLeft, Handshake } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  GoogleLoginButton,
  RegisterPathSelector,
  type RegisterPath,
} from '@/features/auth'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField } from '@/components/form-field'
import { PasswordInput } from '@/components/inputs/password-input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/use-auth'
import { registerIndividual, registerWithEmailPassword } from '@/services/authService'

/** Schema factories, not module-scope constants — `t` isn't available at
 * module scope. Rebuilt via `useMemo(() => makeXSchema(t), [t])` so a
 * language switch mid-form re-translates validation messages. */
function makeDetailsSchema(t: TFunction<'auth'>) {
  return z.object({
    name: z
      .string()
      .min(2, t('validation.nameMin'))
      .max(60, t('validation.nameMax')),
    email: z
      .string()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.emailInvalid')),
    instituteCode: z.string().optional(),
    termsAccepted: z.boolean().refine((value) => value === true, {
      message: t('validation.termsRequired'),
    }),
  })
}

type DetailsFormValues = z.infer<ReturnType<typeof makeDetailsSchema>>

function makePasswordDetailsSchema(t: TFunction<'auth'>) {
  return makeDetailsSchema(t)
    .extend({
      password: z.string().min(6, t('validation.passwordMin')),
      confirmPassword: z.string().min(1, t('validation.confirmPasswordRequired')),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t('validation.passwordsDoNotMatch'),
      path: ['confirmPassword'],
    })
}

type PasswordDetailsFormValues = z.infer<ReturnType<typeof makePasswordDetailsSchema>>

type Step = 'choose-path' | 'details' | 'institution-not-available'
type RegisterMethod = 'code' | 'password'

/**
 * Register (docs/Registration_Flow.md) — starts with "Choose Your Path"
 * (§3) before any personal info is collected. Individual and Coaching
 * Center Student share the same details form here (the doc places the
 * institute-code field after email verification instead; simplified onto
 * one screen for this auth-module scope — correct when the full onboarding
 * flow is built). Institution Owner is a genuinely separate, sales-assisted
 * B2B flow (§5 — institution details, seat-based plans, staff invites) that
 * doesn't belong in an auth module; it's routed to an honest "not built
 * yet" state instead of a faked onboarding wizard.
 *
 * The details step now offers two ways to prove account ownership — the
 * original Email OTP path (still mocked) and a new real Firebase
 * Email/Password path, added *alongside* it per this session's explicit
 * "add it, don't replace OTP" decision (docs/Authentication.md's
 * passwordless design remains the default/primary path; this is a second,
 * equally-real option, not a takeover).
 */
export function RegisterPage() {
  const { t } = useTranslation('auth')
  const [step, setStep] = useState<Step>('choose-path')
  const [path, setPath] = useState<RegisterPath | null>(null)
  const [method, setMethod] = useState<RegisterMethod>('code')
  const navigate = useNavigate()
  const { login } = useAuth()

  const detailsSchema = useMemo(() => makeDetailsSchema(t), [t])
  const passwordDetailsSchema = useMemo(() => makePasswordDetailsSchema(t), [t])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: '', email: '', instituteCode: '', termsAccepted: false },
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    control: passwordControl,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordDetailsFormValues>({
    resolver: zodResolver(passwordDetailsSchema),
    defaultValues: {
      name: '',
      email: '',
      instituteCode: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  })

  function handleSelectPath(selected: RegisterPath) {
    setPath(selected)
    setStep(selected === 'institution-owner' ? 'institution-not-available' : 'details')
  }

  async function onSubmit(values: DetailsFormValues) {
    try {
      const { otpExpiresInSeconds } = await registerIndividual({
        name: values.name,
        email: values.email,
      })
      navigate(ROUTES.verifyEmail, {
        state: {
          email: values.email,
          intent: 'register',
          rememberMe: true,
          redirectTo: ROUTES.onboarding,
          otpExpiresInSeconds,
        },
      })
    } catch {
      toast.error(t('register.couldNotCreateAccount'), {
        description: t('register.pleaseTryAgain'),
      })
    }
  }

  async function onPasswordSubmit(values: PasswordDetailsFormValues) {
    try {
      const { user, accessToken } = await registerWithEmailPassword(
        values.name,
        values.email,
        values.password,
      )
      login(user, accessToken)
      toast.success(t('register.accountCreated'), { description: values.email })
      navigate(user.onboardingCompleted ? ROUTES.dashboard : ROUTES.onboarding, {
        replace: true,
      })
    } catch (error) {
      toast.error(t('register.couldNotCreateAccount'), {
        description: error instanceof Error ? error.message : t('register.pleaseTryAgain'),
      })
    }
  }

  if (step === 'institution-not-available') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
          <Handshake className="size-6" aria-hidden="true" />
        </span>
        <Heading variant="heading-3">{t('register.letsSetUpInstitution')}</Heading>
        <Text variant="body-sm">{t('register.institutionDescription')}</Text>
        <Button asChild className="w-full">
          <Link to={ROUTES.contact}>{t('register.talkToSales')}</Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="gap-1.5"
          onClick={() => setStep('choose-path')}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('register.chooseDifferentPath')}
        </Button>
      </div>
    )
  }

  if (step === 'details') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <button
            type="button"
            onClick={() => setStep('choose-path')}
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {t('register.back')}
          </button>
          <Heading variant="heading-2">{t('register.createYourAccount')}</Heading>
          <Text variant="body-sm">
            {path === 'coaching-student'
              ? t('register.coachingStudentSubtitle')
              : t('register.individualSubtitle')}
          </Text>
        </div>

        <GoogleLoginButton existingUserRedirectTo={ROUTES.dashboard} />

        <div className="flex items-center gap-3">
          <div className="bg-border h-px flex-1" />
          <Text variant="caption">{t('register.or')}</Text>
          <div className="bg-border h-px flex-1" />
        </div>

        <Tabs
          value={method}
          onValueChange={(value) => setMethod(value as RegisterMethod)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="code">{t('register.verifyByEmailCodeTab')}</TabsTrigger>
            <TabsTrigger value="password">{t('register.setPasswordTab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="mt-4">
            <form
              onSubmit={(event) => void handleSubmit(onSubmit)(event)}
              className="flex flex-col gap-4"
            >
              <FormField
                label={t('register.fullNameLabel')}
                autoComplete="name"
                placeholder={t('register.fullNamePlaceholder')}
                error={errors.name?.message}
                {...register('name')}
              />
              <FormField
                label={t('register.emailLabel')}
                type="email"
                autoComplete="email"
                placeholder={t('register.emailPlaceholder')}
                error={errors.email?.message}
                {...register('email')}
              />
              {path === 'coaching-student' && (
                <FormField
                  label={t('register.instituteCodeLabel')}
                  hint={t('register.instituteCodeHint')}
                  placeholder={t('register.instituteCodePlaceholder')}
                  error={errors.instituteCode?.message}
                  {...register('instituteCode')}
                />
              )}

              <Controller
                name="termsAccepted"
                control={control}
                render={({ field }) => (
                  <TermsCheckbox
                    id="terms-accepted-code"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    error={errors.termsAccepted?.message}
                  />
                )}
              />

              <Button type="submit" className="w-full" loading={isSubmitting}>
                {t('register.createAccountButton')}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="password" className="mt-4">
            <form
              onSubmit={(event) => void handlePasswordSubmit(onPasswordSubmit)(event)}
              className="flex flex-col gap-4"
            >
              <FormField
                label={t('register.fullNameLabel')}
                autoComplete="name"
                placeholder={t('register.fullNamePlaceholder')}
                error={passwordErrors.name?.message}
                {...registerPassword('name')}
              />
              <FormField
                label={t('register.emailLabel')}
                type="email"
                autoComplete="email"
                placeholder={t('register.emailPlaceholder')}
                error={passwordErrors.email?.message}
                {...registerPassword('email')}
              />
              {path === 'coaching-student' && (
                <FormField
                  label={t('register.instituteCodeLabel')}
                  hint={t('register.instituteCodeHint')}
                  placeholder={t('register.instituteCodePlaceholder')}
                  error={passwordErrors.instituteCode?.message}
                  {...registerPassword('instituteCode')}
                />
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="register-password">{t('register.passwordLabel')}</Label>
                <PasswordInput
                  id="register-password"
                  autoComplete="new-password"
                  placeholder={t('register.passwordPlaceholder')}
                  aria-invalid={Boolean(passwordErrors.password)}
                  {...registerPassword('password')}
                />
                {passwordErrors.password?.message && (
                  <Text variant="body-sm" className="text-destructive">
                    {passwordErrors.password.message}
                  </Text>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="register-confirm-password">
                  {t('register.confirmPasswordLabel')}
                </Label>
                <PasswordInput
                  id="register-confirm-password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(passwordErrors.confirmPassword)}
                  {...registerPassword('confirmPassword')}
                />
                {passwordErrors.confirmPassword?.message && (
                  <Text variant="body-sm" className="text-destructive">
                    {passwordErrors.confirmPassword.message}
                  </Text>
                )}
              </div>

              <Controller
                name="termsAccepted"
                control={passwordControl}
                render={({ field }) => (
                  <TermsCheckbox
                    id="terms-accepted-password"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    error={passwordErrors.termsAccepted?.message}
                  />
                )}
              />

              <Button type="submit" className="w-full" loading={isPasswordSubmitting}>
                {t('register.createAccountButton')}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <Text variant="body-sm" className="text-center">
          {t('register.alreadyHaveAccount')}{' '}
          <Link to={ROUTES.login} className="text-primary font-medium hover:underline">
            {t('register.logIn')}
          </Link>
        </Text>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Heading variant="heading-2">{t('register.getStarted')}</Heading>
        <Text variant="body-sm">{t('register.tellUsWhichDescribesYou')}</Text>
      </div>

      <RegisterPathSelector onSelect={handleSelectPath} />

      <Text variant="body-sm" className="text-center">
        {t('register.alreadyHaveAccount')}{' '}
        <Link to={ROUTES.login} className="text-primary font-medium hover:underline">
          {t('register.logIn')}
        </Link>
      </Text>
    </div>
  )
}

function TermsCheckbox({
  id,
  checked,
  onCheckedChange,
  error,
}: {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
}) {
  const { t } = useTranslation('auth')
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          className="mt-0.5"
        />
        <Label htmlFor={id} className="text-sm font-normal">
          {t('register.agreeToTerms')}{' '}
          <Link to={ROUTES.terms} className="text-primary hover:underline">
            {t('register.termsOfService')}
          </Link>{' '}
          {t('register.and')}{' '}
          <Link to={ROUTES.privacy} className="text-primary hover:underline">
            {t('register.privacyPolicy')}
          </Link>
        </Label>
      </div>
      {error && (
        <Text variant="body-sm" className="text-destructive">
          {error}
        </Text>
      )}
    </div>
  )
}
