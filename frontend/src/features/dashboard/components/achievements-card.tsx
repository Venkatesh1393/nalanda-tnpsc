import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Award, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getAchievements } from '@/services/dashboardService'
import { cn } from '@/lib/utils'

/**
 * Widget 18 — Achievements (docs/Dashboard.md §18) — earned badges in full
 * color, unearned in low-opacity grayscale with a lock glyph; a brand-new
 * user with zero earned badges still sees the full grid (the aspiration
 * *is* the empty state, never hidden). Tapping any badge reveals its
 * criteria — visible for locked badges too, per the same aspiration
 * principle.
 */
export function AchievementsCard() {
  const { t } = useTranslation('dashboard')
  const {
    data: achievements,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'achievements'],
    queryFn: getAchievements,
  })

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <Heading variant="heading-4">{t('achievementsCard.heading')}</Heading>
          <Link
            to={ROUTES.settings('profile')}
            className="text-primary text-sm font-medium hover:underline"
          >
            {t('achievementsCard.viewAll')}
          </Link>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title={t('achievementsCard.errorTitle')}
              onRetry={() => void refetch()}
            />
          ) : !achievements ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-full" />
              ))}
            </div>
          ) : (
            <motion.div
              variants={staggerChildren(0.05)}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-3 sm:grid-cols-6"
            >
              {achievements.map((badge) => (
                <motion.div key={badge.id} variants={fadeInUp}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-full border p-2 transition-colors',
                          badge.earned
                            ? 'border-premium-gold/40 bg-premium-gold/10 text-premium-gold'
                            : 'border-border text-muted-foreground grayscale',
                        )}
                        aria-label={
                          badge.earned
                            ? badge.title
                            : t('achievementsCard.lockedAriaLabel', { title: badge.title })
                        }
                      >
                        {badge.earned ? (
                          <Award className="size-5" aria-hidden="true" />
                        ) : (
                          <Lock className="size-4" aria-hidden="true" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <PopoverTitle>{badge.title}</PopoverTitle>
                      <PopoverDescription>{badge.description}</PopoverDescription>
                    </PopoverContent>
                  </Popover>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
