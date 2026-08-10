import { AnimatePresence, motion } from 'framer-motion'
import { Medal, Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import {
  fadeInUp,
  motionCelebratory,
  motionFast,
  staggerChildren,
} from '@/animations/variants'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { EXAM_CATEGORIES } from '@/constants/exam'
import { ROUTES } from '@/constants/routes'
import { useLanguage } from '@/hooks/use-language'
import { getTopRankers } from '@/services/publicService'
import { cn } from '@/lib/utils'
import type { TopRanker } from '@/types/marketing'

function examLabel(examCategory: TopRanker['examCategory'], language: 'en' | 'ta'): string {
  return (
    EXAM_CATEGORIES.find((exam) => exam.id === examCategory)?.label[language] ?? examCategory
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function RankerCard({ ranker }: { ranker: TopRanker }) {
  const { t } = useTranslation('landing')
  const { language } = useLanguage()
  const isTopThree = ranker.rank <= 3

  return (
    <motion.div
      variants={fadeInUp}
      {...(ranker.rank === 1
        ? {
            initial: { opacity: 0, scale: 0.92 },
            whileInView: { opacity: 1, scale: 1 },
            viewport: { once: true },
            transition: motionCelebratory,
          }
        : {})}
      className="w-[220px] shrink-0 snap-start sm:w-auto"
    >
      <Card className="h-full items-center py-6 text-center shadow-xs transition-shadow duration-200 hover:shadow-md motion-safe:transition-[box-shadow,transform] motion-safe:hover:-translate-y-0.5">
        <CardContent className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="size-14">
              <AvatarFallback>{initials(ranker.displayName)}</AvatarFallback>
            </Avatar>
            {isTopThree && (
              <span className="bg-premium-gold text-premium-gold-foreground absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full">
                {ranker.rank === 1 ? (
                  <Trophy className="size-3.5" aria-hidden="true" />
                ) : (
                  <Medal className="size-3.5" aria-hidden="true" />
                )}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Text variant="body-md" className="font-medium">
              {ranker.displayName}
            </Text>
            <Badge variant="outline">{examLabel(ranker.examCategory, language)}</Badge>
          </div>
          <span
            className={cn(
              'text-heading-3 font-bold tabular-nums',
              isTopThree ? 'text-premium-gold' : 'text-primary',
            )}
          >
            {ranker.percentile}
            <span className="text-body-sm font-medium"> {t('topRankers.percentile')}</span>
          </span>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * Top Rankers (docs/Landing_Page_Design.md §13) — aspirational social proof
 * from `GET /public/top-rankers` (docs/API.md §17), a small consented
 * preview distinct from the authenticated full Leaderboard. #1's card gets
 * the one-time `motionCelebratory` treatment (docs/UI_Design_System.md's
 * "celebration is earned and rare" rule) — never repeated on scroll.
 */
export function TopRankersSection() {
  const { t } = useTranslation('landing')
  const { data, isError, refetch } = useQuery({
    queryKey: ['public', 'top-rankers'],
    queryFn: () => getTopRankers(6),
  })
  const items = data ?? []

  if (!isError && data && items.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <Heading as="h2" variant="heading-1">
          {t('topRankers.title')}
        </Heading>
        <Text variant="body-lg" className="text-muted-foreground mt-3">
          {t('topRankers.subtitle')}
        </Text>
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
              title={t('topRankers.errorTitle')}
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
            className="flex gap-4 overflow-x-auto pb-2 sm:justify-center"
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex w-[220px] shrink-0 flex-col items-center gap-3 py-6"
              >
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
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
            aria-label={t('topRankers.scrollableAriaLabel')}
            className="focus-visible:outline-ring flex snap-x gap-4 overflow-x-auto pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 sm:flex-wrap sm:justify-center sm:overflow-visible"
          >
            {items.map((ranker) => (
              <RankerCard key={ranker.rank} ranker={ranker} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 flex justify-center">
        <Button variant="ghost" asChild>
          <Link to={ROUTES.register}>{t('topRankers.viewFullLeaderboard')}</Link>
        </Button>
      </div>
    </section>
  )
}
