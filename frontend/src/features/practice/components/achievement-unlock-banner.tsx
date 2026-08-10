import { motion } from 'framer-motion'
import { Award, PartyPopper } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { motionCelebratory } from '@/animations/variants'
import { Heading, Text } from '@/components/typography'
import type { PracticeAchievementId } from '@/types/practice'

type AchievementUnlockBannerProps = {
  achievementIds: PracticeAchievementId[]
}

/**
 * The one moment in the entire Practice Summary that earns the stronger
 * `motion-celebratory` treatment (docs/Smart_Practice.md §15,
 * docs/UI_Design_System.md §19/§32) — a genuine, infrequent milestone,
 * deliberately distinct from the routine, restrained motion used for hints,
 * bookmarking, and XP/Coins display everywhere else in this module. Renders
 * nothing when nothing new was unlocked, rather than an empty card.
 */
export function AchievementUnlockBanner({
  achievementIds,
}: AchievementUnlockBannerProps) {
  const { t } = useTranslation('practice')

  if (achievementIds.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={motionCelebratory}
      className="border-premium-gold/40 bg-premium-gold/5 flex flex-col gap-3 rounded-xl border p-5"
    >
      <div className="flex items-center gap-2">
        <PartyPopper className="text-premium-gold size-5" aria-hidden="true" />
        <Heading variant="heading-4">
          {t('achievementUnlockBanner.title', { count: achievementIds.length })}
        </Heading>
      </div>
      <div className="flex flex-wrap gap-3">
        {achievementIds.map((id) => (
          <div
            key={id}
            className="border-premium-gold/30 bg-background flex items-center gap-3 rounded-lg border px-4 py-3"
          >
            <span className="bg-premium-gold/10 text-premium-gold flex size-10 shrink-0 items-center justify-center rounded-full">
              <Award className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <Text as="span" variant="body-md" className="font-medium">
                {t(`achievements.${id}.title`)}
              </Text>
              <Text variant="caption">{t(`achievements.${id}.description`)}</Text>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
