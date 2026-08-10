import type { TFunction } from 'i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { fadeInUp, motionFast, staggerChildren } from '@/animations/variants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { useLanguage } from '@/hooks/use-language'
import { getPricingPlans } from '@/services/paymentsService'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/utils/format-date'
import type { PricingPlan } from '@/types/marketing'

type BillingCycle = 'monthly' | 'annual'

function tierLabel(t: TFunction<'landing'>, tier: PricingPlan['tier']): string {
  return t(`pricing.tiers.${tier}`)
}

function formatPrice(
  t: TFunction<'landing'>,
  language: 'en' | 'ta',
  plan: PricingPlan,
  cycle: BillingCycle,
): string {
  if (plan.tier === 'institutional') return t('pricing.custom')
  const amount = cycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice
  if (amount === 0) return t('pricing.free')
  return `₹${formatNumber(amount, language)}`
}

function PlanCard({ plan, cycle }: { plan: PricingPlan; cycle: BillingCycle }) {
  const { t } = useTranslation('landing')
  const { language } = useLanguage()
  const isPro = plan.tier === 'pro'
  const isInstitutional = plan.tier === 'institutional'

  return (
    <Card
      className={cn(
        'min-w-[85%] shrink-0 snap-start shadow-xs transition-shadow duration-200 hover:shadow-md motion-safe:transition-[box-shadow,transform] motion-safe:hover:-translate-y-0.5 md:min-w-0',
        isPro && 'bg-accent/60 ring-primary/40',
      )}
    >
      <CardHeader className="gap-3">
        <Text variant="overline">{tierLabel(t, plan.tier)}</Text>
        <div className="flex items-baseline gap-1">
          <AnimatePresence mode="wait">
            <motion.span
              key={`${plan.tier}-${cycle}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={motionFast}
              className="text-heading-1 font-bold tabular-nums"
            >
              {formatPrice(t, language, plan, cycle)}
            </motion.span>
          </AnimatePresence>
          {!isInstitutional && plan.monthlyPrice > 0 && (
            <Text variant="body-sm">
              / {cycle === 'monthly' ? t('pricing.perMonth') : t('pricing.perYear')}
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
        {isInstitutional ? (
          <Button variant="outline" asChild>
            <Link to={ROUTES.contact}>{t('pricing.talkToSales')}</Link>
          </Button>
        ) : (
          <Button variant={isPro ? 'default' : 'secondary'} asChild>
            <Link to={ROUTES.register}>
              {plan.tier === 'free'
                ? t('pricing.getStartedFree')
                : t('pricing.upgradeTo', { tier: tierLabel(t, plan.tier) })}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Premium Section / Pricing (docs/Landing_Page_Design.md §15) — reads real
 * tiers from `GET /payments/plans` (docs/API.md §8, public/no-auth), never a
 * "Contact Us" gate for the consumer tiers. Each card lists only its own
 * included features (the API returns per-plan feature lists, not a unified
 * comparison matrix) rather than fabricating a not-included column.
 */
export function PricingSection() {
  const { t } = useTranslation('landing')
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const { data, isError, refetch } = useQuery({
    queryKey: ['payments', 'plans'],
    queryFn: getPricingPlans,
  })
  const plans = data ?? []

  if (!isError && data && plans.length === 0) return null

  return (
    <section
      id="pricing"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24"
    >
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <Heading as="h2" variant="heading-1">
          {t('pricing.title')}
        </Heading>
        <Text variant="body-lg" className="text-muted-foreground mt-3">
          {t('pricing.subtitle')}
        </Text>
      </div>

      {!isError && (
        <div className="mb-8 flex justify-center">
          <div className="bg-muted inline-flex items-center gap-1 rounded-lg p-1">
            <Button
              variant={cycle === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              aria-pressed={cycle === 'monthly'}
              onClick={() => setCycle('monthly')}
            >
              {t('pricing.monthly')}
            </Button>
            <Button
              variant={cycle === 'annual' ? 'default' : 'ghost'}
              size="sm"
              aria-pressed={cycle === 'annual'}
              onClick={() => setCycle('annual')}
            >
              {t('pricing.annual')}
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isError ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionFast}
          >
            <ErrorState
              title={t('pricing.errorTitle')}
              onRetry={() => void refetch()}
            />
          </motion.div>
        ) : !data ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionFast}
            className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-4"
          >
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="min-w-[85%] shrink-0 md:min-w-0">
                <CardHeader>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-20" />
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            variants={staggerChildren(0.06)}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            tabIndex={0}
            role="region"
            aria-label={t('pricing.scrollableAriaLabel')}
            className="focus-visible:outline-ring flex snap-x gap-4 overflow-x-auto pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-4"
          >
            {plans.map((plan) => (
              <motion.div key={plan.tier} variants={fadeInUp}>
                <PlanCard plan={plan} cycle={cycle} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
