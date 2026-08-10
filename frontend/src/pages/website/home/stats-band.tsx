import type { TFunction } from 'i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { motionFast } from '@/animations/variants'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import { useCountUp } from '@/hooks/use-count-up'
import { useLanguage } from '@/hooks/use-language'
import { getPlatformStats } from '@/services/publicService'
import { formatNumber } from '@/utils/format-date'
import type { PlatformStats } from '@/types/marketing'

type Counter = { key: keyof PlatformStats; label: string }

/** Built from `t` rather than a module-scope constant — `t` isn't
 * available at module scope. */
function buildCounters(t: TFunction<'landing'>): Counter[] {
  return [
    { key: 'questionsCount', label: t('statsBand.questionsCount') },
    { key: 'currentAffairsDaysCount', label: t('statsBand.currentAffairsDaysCount') },
    { key: 'mockTestsCount', label: t('statsBand.mockTestsCount') },
    { key: 'studentsCount', label: t('statsBand.studentsCount') },
  ]
}

function CounterFigure({ value, label }: { value: number; label: string }) {
  const { language } = useLanguage()
  const { ref, value: animatedValue } = useCountUp(value)

  return (
    <div ref={ref} className="flex flex-col items-center gap-1 text-center">
      <span className="text-heading-1 text-primary sm:text-display font-bold tabular-nums">
        {formatNumber(animatedValue, language)}+
      </span>
      <Text variant="body-sm">{label}</Text>
    </div>
  )
}

/**
 * The Live Stats Counters band (docs/Landing_Page_Design.md §7-10) — proof
 * of scale directly beneath the Hero. Reads real platform-wide counts from
 * `GET /public/stats` (docs/API.md §17); shows a skeleton while pending and
 * an honest error/retry state rather than any placeholder figure.
 */
export function StatsBand() {
  const { t } = useTranslation('landing')
  const counters = buildCounters(t)
  const {
    data: stats,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['public', 'stats'],
    queryFn: getPlatformStats,
  })

  return (
    <section className="bg-accent/40">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
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
                title={t('statsBand.errorTitle')}
                onRetry={() => void refetch()}
              />
            </motion.div>
          ) : stats ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={motionFast}
              className="grid grid-cols-2 gap-8 lg:grid-cols-4"
            >
              {counters.map((counter) => (
                <CounterFigure
                  key={counter.key}
                  value={stats[counter.key]}
                  label={counter.label}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={motionFast}
              className="grid grid-cols-2 gap-8 lg:grid-cols-4"
            >
              {counters.map((counter) => (
                <div key={counter.key} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
