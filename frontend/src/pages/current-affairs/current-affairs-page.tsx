import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { EmptyState } from '@/components/empty-state'
import { ToggleChip } from '@/components/inputs/toggle-chip'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import {
  CurrentAffairsFeed,
  CurrentAffairsSearch,
  MonthlyArchive,
} from '@/features/current-affairs'
import type { CurrentAffairsPeriod } from '@/types/currentAffairs'

const PERIOD_TAB_VALUES: CurrentAffairsPeriod[] = ['daily', 'weekly', 'monthly']

function isCurrentAffairsPeriod(
  value: string | undefined,
): value is CurrentAffairsPeriod {
  return value === 'daily' || value === 'weekly' || value === 'monthly'
}

/** `/app/current-affairs/:period` (docs/InformationArchitecture.md §9) — the
 * module's entry point: Daily/Weekly Digest feeds, or the browsable Monthly
 * Archive, all behind one search bar and one set of period tabs. */
export function CurrentAffairsPage() {
  const { t } = useTranslation('currentAffairs')
  const { period } = useParams()
  const navigate = useNavigate()

  if (!isCurrentAffairsPeriod(period)) {
    return (
      <EmptyState
        title={t('page.unknownView.title')}
        description={t('page.unknownView.description')}
        actionLabel={t('page.unknownView.actionLabel')}
        onAction={() => navigate(ROUTES.dashboard)}
      />
    )
  }

  return (
    <motion.div
      variants={staggerChildren(0.08)}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      <motion.div variants={fadeInUp} className="flex flex-col gap-1">
        <Heading variant="heading-2">{t('page.heading')}</Heading>
        <Text variant="body-sm">{t('page.subtitle')}</Text>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <CurrentAffairsSearch />
      </motion.div>

      <motion.div variants={fadeInUp} className="flex flex-wrap gap-2">
        {PERIOD_TAB_VALUES.map((value) => (
          <ToggleChip
            key={value}
            role="radio"
            label={t(`page.periodTabs.${value}`)}
            selected={period === value}
            onSelect={() => navigate(ROUTES.currentAffairs(value))}
          />
        ))}
      </motion.div>

      <motion.div variants={fadeInUp}>
        {period === 'monthly' ? (
          <MonthlyArchive />
        ) : (
          <CurrentAffairsFeed period={period} />
        )}
      </motion.div>
    </motion.div>
  )
}
