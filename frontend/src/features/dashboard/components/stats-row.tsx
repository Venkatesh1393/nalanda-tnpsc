import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Coins, Trophy } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/stat-card'
import { StreakFlameIcon } from '@/icons/streak-flame-icon'
import { useCountUp } from '@/hooks/use-count-up'
import { getDashboardSummary, getRankSummary } from '@/services/dashboardService'

/** Wraps a `StatCard`'s numeric value in the shared count-up treatment
 * (docs/Dashboard.md §4's "counts up once on first load") without needing
 * `StatCard` itself to know about the animation. */
function AnimatedStatCard({
  label,
  target,
  format = (value: number) => value.toLocaleString('en-IN'),
  icon,
  trend,
  trendLabel,
}: {
  label: string
  target: number
  format?: (value: number) => string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  trend?: number
  trendLabel?: string
}) {
  const { ref, value } = useCountUp(target)
  return (
    <div ref={ref}>
      <StatCard
        label={label}
        value={format(value)}
        icon={icon}
        trend={trend}
        trendLabel={trendLabel}
      />
    </div>
  )
}

/**
 * Widgets 4-7 — Study Streak, XP Points, Coins, Rank (docs/Dashboard.md
 * §4-§7) — four equal-width tiles in one row, per the shared tile layout
 * those sections describe together. Streak/XP/Coins share the summary
 * query with the Welcome Banner/Daily Study Goal/Premium Banner; Rank reads
 * its own `leaderboard/me`-equivalent fetch (docs/Dashboard.md §21).
 */
export function StatsRow() {
  const { t } = useTranslation('dashboard')
  const { data: summary } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
  })
  const { data: rank } = useQuery({
    queryKey: ['dashboard', 'rank'],
    queryFn: getRankSummary,
  })

  return (
    <motion.div
      variants={staggerChildren(0.06)}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {summary ? (
        <>
          <motion.div variants={fadeInUp}>
            <AnimatedStatCard
              label={t('statsRow.studyStreakLabel')}
              target={summary.streak.current}
              format={(value) => t('statsRow.streakDays', { count: Math.round(value) })}
              icon={StreakFlameIcon}
              trendLabel={t('statsRow.bestStreak', { count: summary.streak.longest })}
            />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <AnimatedStatCard
              label={t('statsRow.xpPointsLabel', { level: summary.level })}
              target={summary.xp}
              icon={Trophy}
              trend={summary.xpGainedThisWeek}
              trendLabel={t('statsRow.thisWeek')}
            />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <AnimatedStatCard
              label={t('statsRow.coinsLabel')}
              target={summary.coins}
              icon={Coins}
            />
          </motion.div>
        </>
      ) : (
        [0, 1, 2].map((i) => (
          <motion.div key={i} variants={fadeInUp}>
            <Skeleton className="h-24 w-full rounded-xl" />
          </motion.div>
        ))
      )}

      <motion.div variants={fadeInUp}>
        {!rank ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : rank.cohortSize === 0 ? (
          // No Analytics/Leaderboard data exists for this user yet (a
          // brand-new account, or too few attempts) — an honest "not yet"
          // state rather than a fabricated "Top 100%" (docs/Dashboard.md §7).
          <StatCard
            label={t('statsRow.rankLabel')}
            value="—"
            icon={Trophy}
            trendLabel={t('statsRow.rankNotYetTrend')}
          />
        ) : (
          <StatCard
            label={t('statsRow.rankLabel')}
            value={t('statsRow.rankTopPercent', { percent: 100 - rank.percentile })}
            icon={Trophy}
            trendLabel={
              rank.isSmallCohort
                ? t('statsRow.rankSmallCohortTrend')
                : t('statsRow.rankTrend', {
                    rank: rank.rankEstimate.toLocaleString('en-IN'),
                    total: rank.cohortSize.toLocaleString('en-IN'),
                  })
            }
          />
        )}
      </motion.div>
    </motion.div>
  )
}
