import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { SubjectCard } from '@/components/subject-card'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { getSubjectIcon } from '@/features/learn/lib/subject-icons'
import { ToggleChip } from '@/components/inputs/toggle-chip'
import { getSubjects } from '@/services/learnService'

type SubjectFilter = 'all' | 'in-progress' | 'completed'

const FILTERS: { value: SubjectFilter; labelKey: 'all' | 'inProgress' | 'completed' }[] = [
  { value: 'all', labelKey: 'all' },
  { value: 'in-progress', labelKey: 'inProgress' },
  { value: 'completed', labelKey: 'completed' },
]

/**
 * The Subjects grid (docs/Learn_Module.md §1) — the Learn module's entry
 * point. Cards fade-and-rise in staggered, matching the reveal pattern used
 * throughout the product for card grids; a subject with genuinely no
 * content is unreachable here (subjects are core reference data), so the
 * error state only ever represents a load failure, never emptiness.
 */
export function SubjectGrid() {
  const { t } = useTranslation('learn')
  const navigate = useNavigate()
  const [filter, setFilter] = useState<SubjectFilter>('all')
  const {
    data: subjects,
    isError,
    refetch,
  } = useQuery({ queryKey: ['learn', 'subjects'], queryFn: getSubjects })

  if (isError) {
    return (
      <ErrorState title={t('subjectGrid.errorTitle')} onRetry={() => void refetch()} />
    )
  }

  const filtered = subjects?.filter((subject) => {
    if (filter === 'completed') return subject.progressPercent === 100
    if (filter === 'in-progress')
      return subject.progressPercent > 0 && subject.progressPercent < 100
    return true
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <ToggleChip
            key={option.value}
            role="radio"
            label={t(`subjectGrid.filters.${option.labelKey}`)}
            selected={filter === option.value}
            onSelect={() => setFilter(option.value)}
          />
        ))}
      </div>

      {!subjects ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered && filtered.length === 0 ? (
        <EmptyState
          title={t('subjectGrid.emptyTitle')}
          description={t('subjectGrid.emptyDescription')}
          actionLabel={t('subjectGrid.showAll')}
          onAction={() => setFilter('all')}
        />
      ) : (
        <motion.div
          variants={staggerChildren(0.06)}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered?.map((subject) => (
            <motion.div key={subject.id} variants={fadeInUp}>
              <SubjectCard
                icon={getSubjectIcon(subject.iconKey)}
                name={subject.name}
                itemCountLabel={t('subjectGrid.topicCount', { count: subject.topicCount })}
                progress={subject.progressPercent}
                onSelect={() => navigate(ROUTES.learnTopics(subject.id))}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
