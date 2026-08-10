import { AnimatePresence, motion } from 'framer-motion'
import { Newspaper } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { fadeInUp, motionFast, staggerChildren } from '@/animations/variants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { useLanguage } from '@/hooks/use-language'
import { getCurrentAffairsPreview } from '@/services/currentAffairsService'
import { cn } from '@/lib/utils'

function formatDateLabel(isoDate: string, language: 'en' | 'ta', todayLabel: string): string {
  const date = new Date(isoDate)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  if (isToday) return todayLabel
  const locale = language === 'ta' ? 'ta-IN' : 'en-IN'
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

/**
 * The Daily Current Affairs Preview (docs/Landing_Page_Design.md §12) —
 * pulled live from `GET /current-affairs` (docs/API.md §13), never mocked,
 * per CLAUDE.md's "never use dummy data" rule. 3-column grid desktop,
 * horizontally scrollable single row on mobile.
 */
export function CurrentAffairsPreview() {
  const { t } = useTranslation('landing')
  const { language } = useLanguage()
  const { data, isError, refetch } = useQuery({
    queryKey: ['current-affairs', 'preview'],
    queryFn: () => getCurrentAffairsPreview(5),
  })
  const items = data ?? []

  if (!isError && data && items.length === 0) return null

  return (
    <section
      id="current-affairs"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24"
    >
      <div className="mb-8 flex items-center gap-3">
        <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
          <Newspaper className="size-5" aria-hidden="true" />
        </span>
        <div>
          <Heading variant="heading-2">{t('currentAffairsPreview.title')}</Heading>
          <Text variant="body-sm">{t('currentAffairsPreview.subtitle')}</Text>
        </div>
      </div>

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
              title={t('currentAffairsPreview.errorTitle')}
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
            className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3"
          >
            {[0, 1, 2].map((i) => (
              <Card key={i} className="w-[260px] shrink-0 md:w-auto">
                <CardHeader>
                  <Skeleton className="h-4 w-16" />
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
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
            aria-label={t('currentAffairsPreview.scrollableAriaLabel')}
            className="focus-visible:outline-ring flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3"
          >
            {items.map((item) => (
              <motion.div
                key={item.id}
                variants={fadeInUp}
                className={cn('w-[280px] shrink-0 snap-start md:w-auto')}
              >
                <Card className="h-full shadow-xs transition-shadow duration-200 hover:shadow-md motion-safe:transition-[box-shadow,transform] motion-safe:hover:-translate-y-0.5">
                  <CardHeader>
                    <Badge
                      variant="outline"
                      className="bg-accent text-accent-foreground w-fit border-0"
                    >
                      {formatDateLabel(item.date, language, t('currentAffairsPreview.today'))}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <Heading variant="heading-4">{item.title}</Heading>
                    <Text variant="body-sm">{item.excerpt}</Text>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 flex justify-center">
        <Button variant="secondary" asChild>
          <Link to={ROUTES.register}>{t('currentAffairsPreview.seeFullButton')}</Link>
        </Button>
      </div>
    </section>
  )
}
