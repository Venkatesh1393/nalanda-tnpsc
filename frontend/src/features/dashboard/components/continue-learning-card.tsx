import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { PlayCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp } from '@/animations/variants'
import { SubjectCard } from '@/components/subject-card'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { getContinueLearning } from '@/services/dashboardService'
import { slugify } from '@/utils/slugify'

/**
 * Widget 9 — Continue Learning (docs/Dashboard.md §9) — the single most
 * prominent card on the page, per docs/UI_Design_System.md §37 (a subtle
 * `primary-50` emphasis wash). Reuses `SubjectCard` rather than a bespoke
 * card: its subject/topic breadcrumb becomes the `itemCountLabel` line, the
 * subtopic becomes the title, and `progress` drives the existing bar.
 */
export function ContinueLearningCard() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const {
    data: item,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'continue-learning'],
    queryFn: getContinueLearning,
  })

  if (isError) {
    return (
      <motion.div variants={fadeInUp}>
        <ErrorState
          title={t('continueLearningCard.errorTitle')}
          onRetry={() => void refetch()}
        />
      </motion.div>
    )
  }

  if (item === undefined) {
    return (
      <motion.div variants={fadeInUp}>
        <Skeleton className="h-28 w-full rounded-xl" />
      </motion.div>
    )
  }

  if (item === null) {
    return (
      <motion.div variants={fadeInUp}>
        <EmptyState
          title={t('continueLearningCard.emptyTitle')}
          description={t('continueLearningCard.emptyDescription')}
          actionLabel={t('continueLearningCard.emptyActionLabel')}
          onAction={() => navigate(ROUTES.learnSubjects)}
        />
      </motion.div>
    )
  }

  return (
    <motion.div variants={fadeInUp}>
      <SubjectCard
        icon={PlayCircle}
        name={item.subtopic}
        itemCountLabel={`${item.subject} · ${item.topic}`}
        progress={item.progressPercent}
        onSelect={() =>
          navigate(
            ROUTES.learnLesson(
              slugify(item.subject),
              slugify(item.topic),
              slugify(item.subtopic),
            ),
          )
        }
        className="bg-primary/5"
      />
    </motion.div>
  )
}
