import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, LayoutDashboard, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ErrorState } from '@/components/error-state'
import { Logo } from '@/components/logo'
import { Skeleton } from '@/components/ui/skeleton'
import { ThemeToggle } from '@/components/theme-toggle'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { PaymentHistoryCard } from '@/features/payments/components/payment-history-card'
import { useUpgradeCheckout } from '@/features/payments/hooks/use-upgrade-checkout'
import { cancelSubscription, getMySubscription, getPricingPlans } from '@/services/paymentsService'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/utils/format-date'
import { useLanguage } from '@/hooks/use-language'
import { FEATURE_KEYS, type BillingCycle, type FeatureKey } from '@/types/payments'
import type { PricingPlan } from '@/types/marketing'

const STATUS_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  active: 'success',
  past_due: 'warning',
  cancelled: 'destructive',
  expired: 'destructive',
  inactive: 'outline',
}

function formatDate(iso: string | null, language: 'en' | 'ta'): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function SubscriptionPage() {
  const { t } = useTranslation(['payments', 'landing'])
  const { language } = useLanguage()
  const queryClient = useQueryClient()
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const { upgrade, isProcessing, pendingTier } = useUpgradeCheckout()

  const {
    data: subscription,
    isError: isSubscriptionError,
    refetch: refetchSubscription,
  } = useQuery({
    queryKey: ['payments', 'subscription'],
    queryFn: getMySubscription,
  })

  const {
    data: plans,
    isError: isPlansError,
    refetch: refetchPlans,
  } = useQuery({
    queryKey: ['payments', 'plans'],
    queryFn: getPricingPlans,
  })

  const cancelMutation = useMutation({
    mutationFn: (reason: string | undefined) => cancelSubscription(reason),
    onSuccess: (result) => {
      toast.success(
        t('payments:currentPlan.cancelledToast', {
          date: formatDate(result.accessUntil, language),
        }),
      )
      void queryClient.invalidateQueries({ queryKey: ['payments', 'subscription'] })
    },
    onError: () => toast.error(t('payments:currentPlan.cancelErrorToast')),
  })

  const canCancel = subscription?.status === 'active' && subscription.tier !== 'free'

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to={ROUTES.dashboard}>
              <LayoutDashboard className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('payments:page.dashboard')}</span>
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
        <div>
          <Heading variant="heading-2">{t('payments:page.title')}</Heading>
          <Text variant="body-sm" className="text-muted-foreground mt-1">
            {t('payments:page.subtitle')}
          </Text>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('payments:currentPlan.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isSubscriptionError ? (
              <ErrorState
                title={t('payments:currentPlan.loadErrorTitle')}
                onRetry={() => void refetchSubscription()}
              />
            ) : !subscription ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={subscription.tier === 'free' ? 'outline' : 'premium'}>
                    {t(`landing:pricing.tiers.${subscription.tier}`)}
                  </Badge>
                  <Badge variant={STATUS_BADGE_VARIANT[subscription.status]}>
                    {t(`payments:currentPlan.status.${subscription.status}`)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      {t('payments:currentPlan.billingLabel')}
                    </span>
                    <span className="capitalize">
                      {subscription.billingCycle ?? t('payments:currentPlan.noDate')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      {t('payments:currentPlan.startedLabel')}
                    </span>
                    <span>{formatDate(subscription.startDate, language)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      {t('payments:currentPlan.endsLabel')}
                    </span>
                    <span>{formatDate(subscription.endDate, language)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Text variant="body-sm" className="font-medium">
                    {t('payments:currentPlan.entitlementsTitle')}
                  </Text>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {FEATURE_KEYS.map((feature: FeatureKey) => {
                      const entitled = subscription.entitlements[feature]
                      return (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          {entitled ? (
                            <Check
                              className="text-success size-4 shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <Lock
                              className="text-muted-foreground size-4 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <span className={cn(!entitled && 'text-muted-foreground')}>
                            {t(`payments:currentPlan.feature.${feature}`)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {canCancel && (
                  <div className="border-t pt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          {t('payments:currentPlan.cancelButton')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <span className="bg-destructive/10 text-destructive mb-1 flex size-10 items-center justify-center rounded-full">
                            <AlertTriangle className="size-5" aria-hidden="true" />
                          </span>
                          <DialogTitle>{t('payments:currentPlan.cancelDialogTitle')}</DialogTitle>
                          <DialogDescription>
                            {t('payments:currentPlan.cancelDialogDescription', {
                              date: formatDate(subscription.endDate, language),
                            })}
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter showCloseButton>
                          <Button
                            variant="destructive"
                            loading={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(undefined)}
                          >
                            {t('payments:currentPlan.confirmCancelButton')}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Heading variant="heading-3">{t('payments:plans.title')}</Heading>
            <div className="bg-muted inline-flex items-center gap-1 rounded-lg p-1">
              <Button
                variant={cycle === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                aria-pressed={cycle === 'monthly'}
                onClick={() => setCycle('monthly')}
              >
                {t('payments:plans.monthly')}
              </Button>
              <Button
                variant={cycle === 'annual' ? 'default' : 'ghost'}
                size="sm"
                aria-pressed={cycle === 'annual'}
                onClick={() => setCycle('annual')}
              >
                {t('payments:plans.annual')}
              </Button>
            </div>
          </div>

          {isPlansError ? (
            <ErrorState
              title={t('payments:plans.errorTitle')}
              onRetry={() => void refetchPlans()}
            />
          ) : !plans ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.tier}
                  plan={plan}
                  cycle={cycle}
                  isCurrent={subscription?.tier === plan.tier}
                  isProcessing={isProcessing && pendingTier === plan.tier}
                  onUpgrade={() => {
                    if (plan.tier === 'plus' || plan.tier === 'pro') {
                      void upgrade(plan.tier, cycle)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <PaymentHistoryCard />
      </main>
    </div>
  )
}

function PlanCard({
  plan,
  cycle,
  isCurrent,
  isProcessing,
  onUpgrade,
}: {
  plan: PricingPlan
  cycle: BillingCycle
  isCurrent: boolean
  isProcessing: boolean
  onUpgrade: () => void
}) {
  const { t } = useTranslation(['payments', 'landing'])
  const { language } = useLanguage()
  const isInstitutional = plan.tier === 'institutional'
  const isFree = plan.tier === 'free'
  const isPro = plan.tier === 'pro'
  const isCheckoutEligible = plan.tier === 'plus' || plan.tier === 'pro'

  function formatPrice(): string {
    if (isInstitutional) return t('payments:plans.custom')
    const amount = cycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice
    if (amount === 0) return t('payments:plans.free')
    return `₹${formatNumber(amount, language)}`
  }

  return (
    <Card className={cn(isPro && 'ring-primary/40 bg-accent/60', isCurrent && 'ring-2')}>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <Text variant="overline">{t(`landing:pricing.tiers.${plan.tier}`)}</Text>
          {isCurrent && <Badge variant="premium">{t('payments:plans.currentPlanBadge')}</Badge>}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-heading-1 font-bold tabular-nums">{formatPrice()}</span>
          {!isInstitutional && plan.monthlyPrice > 0 && (
            <Text variant="body-sm">
              {cycle === 'monthly' ? t('payments:plans.perMonth') : t('payments:plans.perYear')}
            </Text>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {isCurrent ? (
          <Button variant="outline" disabled>
            {t('payments:plans.currentPlanBadge')}
          </Button>
        ) : isInstitutional ? (
          <Button variant="outline" asChild>
            <Link to={ROUTES.contact}>{t('payments:plans.talkToSales')}</Link>
          </Button>
        ) : isFree ? (
          <Button variant="outline" disabled>
            {t('payments:plans.free')}
          </Button>
        ) : (
          isCheckoutEligible && (
            <Button
              variant={isPro ? 'default' : 'secondary'}
              loading={isProcessing}
              onClick={onUpgrade}
            >
              {t('payments:plans.upgradeButton')}
            </Button>
          )
        )}
      </CardContent>
    </Card>
  )
}
