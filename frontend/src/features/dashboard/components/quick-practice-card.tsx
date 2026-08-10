import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Heading } from '@/components/typography'
import { ROUTES } from '@/constants/routes'

const QUICK_PRACTICE_MODES = [
  { mode: 'hundred-questions', labelKey: 'hundredQuestions' },
  { mode: 'quiz', labelKey: 'quiz' },
  { mode: 'sectional', labelKey: 'sectional' },
  { mode: 'mock', labelKey: 'mock' },
] as const

/**
 * Widget 14 — Quick Practice (docs/Dashboard.md §14) — one-tap deep links
 * into Practice, no data dependency, no confirmation step (starting
 * practice is a low-risk, easily-abandoned action).
 */
export function QuickPracticeCard() {
  const { t } = useTranslation('dashboard')

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <Heading variant="heading-4">{t('quickPracticeCard.heading')}</Heading>
        </CardHeader>
        <CardContent>
          <motion.div
            variants={staggerChildren(0.05)}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap gap-2"
          >
            {QUICK_PRACTICE_MODES.map(({ mode, labelKey }) => (
              <motion.div key={mode} variants={fadeInUp}>
                <Button variant="secondary" asChild>
                  <Link to={ROUTES.practice(mode)}>
                    {t(`quickPracticeCard.modes.${labelKey}`)}
                  </Link>
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
