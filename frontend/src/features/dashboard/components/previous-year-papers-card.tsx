import { motion } from 'framer-motion'
import { Archive } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp } from '@/animations/variants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'

/**
 * A simple, no-data-dependency deep link into the Previous Year Question
 * Papers page — same "one-tap link, no confirmation step" shape as
 * `quick-practice-card.tsx`, since the real numbers (free downloads
 * remaining, unlocked status) already live on that page itself and would
 * just be duplicated here for no benefit.
 */
export function PreviousYearPapersCard() {
  const { t } = useTranslation('dashboard')

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <Heading variant="heading-4">{t('previousYearPapersCard.heading')}</Heading>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Text variant="body-sm">{t('previousYearPapersCard.description')}</Text>
          <Button variant="secondary" className="w-fit" asChild>
            <Link to={ROUTES.questionPapers}>
              <Archive className="size-4" aria-hidden="true" />
              {t('previousYearPapersCard.action')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
