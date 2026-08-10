import type { TFunction } from 'i18next'
import { motion } from 'framer-motion'
import { BarChart3, CalendarCheck2, Radio, Sparkles, Target, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { ScoreRing } from '@/components/charts/score-ring'
import { FeatureCard } from '@/components/feature-card'
import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'

type Feature = {
  icon: LucideIcon
  title: string
  description: string
  ai?: boolean
  /** In-page anchor id (docs/Navigation.md §1's active-section pattern) —
   * matches the Navbar's product-module links (components/layout/navbar.tsx)
   * where one exists, so "Smart Practice" in the nav lands on this exact card. */
  anchorId?: string
  graphic?: ReactNode
}

/** Built from `t` rather than a module-scope constant — `t` isn't
 * available at module scope. */
function buildFeatures(t: TFunction<'landing'>): Feature[] {
  return [
    {
      icon: Sparkles,
      title: t('featureCards.aiTutor.title'),
      description: t('featureCards.aiTutor.description'),
      ai: true,
    },
    {
      icon: Target,
      title: t('featureCards.smartPractice.title'),
      description: t('featureCards.smartPractice.description'),
      anchorId: 'smart-practice',
    },
    {
      icon: Radio,
      title: t('featureCards.weeklyLiveExam.title'),
      description: t('featureCards.weeklyLiveExam.description'),
      anchorId: 'live-exam',
    },
    {
      icon: BarChart3,
      title: t('featureCards.analytics.title'),
      description: t('featureCards.analytics.description'),
      anchorId: 'analytics',
      graphic: <ScoreRing value={87} size={64} strokeWidth={6} />,
    },
    {
      icon: Users,
      title: t('featureCards.community.title'),
      description: t('featureCards.community.description'),
      anchorId: 'community',
    },
    {
      icon: CalendarCheck2,
      title: t('featureCards.studyPlanner.title'),
      description: t('featureCards.studyPlanner.description'),
    },
  ]
}

/**
 * The Feature Cards grid (docs/Landing_Page_Design.md §11) — the section
 * that does the actual "convincing" work. Doubles as the `#learn` anchor
 * target for the Navbar's "Learn" link, since this landing page doesn't have
 * a separate dedicated Learn section — the grid collectively represents the
 * platform's learning/practice capability set.
 */
export function FeatureCardsSection() {
  const { t } = useTranslation('landing')
  const features = buildFeatures(t)
  return (
    <section
      id="learn"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24"
    >
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <Heading as="h2" variant="heading-1">
          {t('featureCards.title')}
        </Heading>
        <Text variant="body-lg" className="text-muted-foreground mt-3">
          {t('featureCards.subtitle')}
        </Text>
      </div>

      <motion.div
        variants={staggerChildren(0.06)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((feature) => (
          <motion.div
            key={feature.title}
            variants={fadeInUp}
            id={feature.anchorId}
            className={feature.anchorId ? 'scroll-mt-20' : undefined}
          >
            <FeatureCard
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              ai={feature.ai}
              graphic={feature.graphic}
            />
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-10 flex justify-center">
        <Button variant="secondary" asChild>
          <Link to={ROUTES.features}>{t('featureCards.exploreAll')}</Link>
        </Button>
      </div>
    </section>
  )
}
