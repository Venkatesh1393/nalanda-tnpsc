import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { Heading, Text } from '@/components/typography'
import { ContinueLearningBanner, LearnSearch, SubjectGrid } from '@/features/learn'

/** Subjects — the Learn module's entry point (docs/Learn_Module.md §1). */
export function SubjectsPage() {
  const { t } = useTranslation('learn')

  return (
    <motion.div
      variants={staggerChildren(0.08)}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      <motion.div variants={fadeInUp} className="flex flex-col gap-1">
        <Heading variant="heading-2">{t('subjectsPage.heading')}</Heading>
        <Text variant="body-sm">{t('subjectsPage.subtitle')}</Text>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <LearnSearch />
      </motion.div>

      <ContinueLearningBanner />

      <motion.div variants={fadeInUp}>
        <SubjectGrid />
      </motion.div>
    </motion.div>
  )
}
