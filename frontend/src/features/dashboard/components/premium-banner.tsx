import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp } from '@/animations/variants'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getDashboardSummary } from '@/services/dashboardService'

/**
 * Widget 19 — Premium Banner (docs/Dashboard.md §19) — the page's closing,
 * low-emphasis upsell. Uses the "Upsell card" treatment from
 * docs/UI_Design_System.md §36 (Sangam Gold at low saturation), distinct
 * from `components/premium-card.tsx`'s blur-over-content paywall pattern,
 * since there's no specific gated content being shown here. Renders
 * nothing at all once `subscriptionTier` resolves to anything above Free.
 */
export function PremiumBanner() {
  const { t } = useTranslation('dashboard')
  const { data: summary } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
  })

  if (summary === undefined) {
    return (
      <motion.div variants={fadeInUp}>
        <Skeleton className="h-28 w-full rounded-xl" />
      </motion.div>
    )
  }

  if (summary.subscriptionTier !== 'free') return null

  return (
    <motion.div variants={fadeInUp}>
      <Card className="border-premium-gold/30 bg-premium-gold/5">
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1">
            <Heading variant="heading-4">{t('premiumBanner.heading')}</Heading>
            <Text variant="body-sm">{t('premiumBanner.description')}</Text>
          </div>
          <Button variant="premium" className="w-full shrink-0 sm:w-auto" asChild>
            <Link to={ROUTES.subscription}>{t('premiumBanner.upgrade')}</Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
