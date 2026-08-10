import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getDashboardCurrentAffairs } from '@/services/dashboardService'

/** Widget 12 — Current Affairs Summary (docs/Dashboard.md §12). Reads a
 * mock-only sibling of `services/currentAffairsService.ts`'s real
 * `getCurrentAffairsPreview` (identical `CurrentAffairsPreviewItem` shape),
 * per this session's "mocked data only" scope — see `dashboardService.ts`'s
 * header comment for the swap-over note. */
export function CurrentAffairsCard() {
  const { t } = useTranslation('dashboard')
  const {
    data: items,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'current-affairs'],
    queryFn: getDashboardCurrentAffairs,
  })

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <Heading variant="heading-4">{t('currentAffairsCard.heading')}</Heading>
          <Link
            to={ROUTES.currentAffairs('daily')}
            className="text-primary text-sm font-medium hover:underline"
          >
            {t('currentAffairsCard.viewAll')}
          </Link>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title={t('currentAffairsCard.errorTitle')}
              onRetry={() => void refetch()}
            />
          ) : !items ? (
            <div className="flex flex-col gap-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Text variant="body-sm">{t('currentAffairsCard.emptyText')}</Text>
          ) : (
            <motion.ul
              variants={staggerChildren(0.06)}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-3"
            >
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  variants={fadeInUp}
                  className="flex flex-col gap-0.5"
                >
                  <Text as="span" variant="body-md" className="font-medium">
                    {item.title}
                  </Text>
                  <Text variant="body-sm">{item.excerpt}</Text>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
