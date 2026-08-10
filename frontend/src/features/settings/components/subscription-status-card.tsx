import { useQuery } from '@tanstack/react-query'
import { Crown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getDashboardSummary } from '@/services/dashboardService'

/** Reuses `getDashboardSummary`'s `subscriptionTier` (the same "shared mock
 * world" number `features/dashboard/components/premium-banner.tsx` already
 * reads) rather than a new mock — Payments/Subscription itself
 * (`docs/MASTER_ROADMAP.md` Phase 8) isn't built yet, so "Manage
 * Subscription"/"Upgrade" link to `ROUTES.subscription`, a known not-yet-
 * built destination (same accepted gap Dashboard's own Premium Banner has). */
export function SubscriptionStatusCard() {
  const { t } = useTranslation('settings')
  const {
    data: summary,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('subscriptionStatusCard.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorState
            title={t('subscriptionStatusCard.loadErrorTitle')}
            onRetry={() => void refetch()}
          />
        ) : !summary ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1.5">
              <Badge
                variant={summary.subscriptionTier === 'free' ? 'outline' : 'premium'}
              >
                {t('subscriptionStatusCard.planBadge', {
                  tier: t(`subscriptionStatusCard.tier.${summary.subscriptionTier}`),
                })}
              </Badge>
              <Text variant="body-sm">
                {summary.subscriptionTier === 'free'
                  ? t('subscriptionStatusCard.freeDescription')
                  : t('subscriptionStatusCard.premiumDescription')}
              </Text>
            </div>
            <Button
              variant={summary.subscriptionTier === 'free' ? 'premium' : 'outline'}
              className="w-full shrink-0 gap-1.5 sm:w-auto"
              asChild
            >
              <Link to={ROUTES.subscription}>
                {summary.subscriptionTier === 'free' && (
                  <Crown className="size-4" aria-hidden="true" />
                )}
                {summary.subscriptionTier === 'free'
                  ? t('subscriptionStatusCard.upgradeButton')
                  : t('subscriptionStatusCard.manageButton')}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
