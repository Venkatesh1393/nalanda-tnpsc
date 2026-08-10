import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, motionFast, staggerChildren } from '@/animations/variants'
import { CircularProgress } from '@/components/charts/circular-progress'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { ToggleChip } from '@/components/inputs/toggle-chip'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getTopics } from '@/services/learnService'

type TopicFilter = 'all' | 'in-progress' | 'completed'

const FILTERS: { value: TopicFilter; labelKey: 'all' | 'inProgress' | 'completed' }[] = [
  { value: 'all', labelKey: 'all' },
  { value: 'in-progress', labelKey: 'inProgress' },
  { value: 'completed', labelKey: 'completed' },
]

type TopicListProps = {
  subjectId: string
}

/**
 * The Topics list (docs/Learn_Module.md §2) — a denser vertical list (not a
 * grid, topic names + subtopic counts read better at this density), a
 * subtler/faster `motionFast` stagger than the Subjects grid's hero-card
 * reveal.
 */
export function TopicList({ subjectId }: TopicListProps) {
  const { t } = useTranslation('learn')
  const navigate = useNavigate()
  const [filter, setFilter] = useState<TopicFilter>('all')
  const {
    data: topics,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['learn', 'topics', subjectId],
    queryFn: () => getTopics(subjectId),
  })

  if (isError) {
    return <ErrorState title={t('topicList.errorTitle')} onRetry={() => void refetch()} />
  }

  if (topics && topics.length === 0) {
    return (
      <EmptyState
        title={t('topicList.noTopicsTitle')}
        description={t('topicList.noTopicsDescription')}
      />
    )
  }

  const filtered = topics?.filter((topic) => {
    if (filter === 'completed') return topic.isComplete
    if (filter === 'in-progress') return topic.progressPercent > 0 && !topic.isComplete
    return true
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <ToggleChip
            key={option.value}
            role="radio"
            label={t(`topicList.filters.${option.labelKey}`)}
            selected={filter === option.value}
            onSelect={() => setFilter(option.value)}
          />
        ))}
      </div>

      {!topics ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered && filtered.length === 0 ? (
        <EmptyState
          title={t('topicList.emptyTitle')}
          actionLabel={t('topicList.showAll')}
          onAction={() => setFilter('all')}
        />
      ) : (
        <motion.ul
          variants={staggerChildren(0.04)}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-2"
        >
          {filtered?.map((topic) => (
            <motion.li key={topic.id} variants={fadeInUp} layout transition={motionFast}>
              <button
                type="button"
                onClick={() => navigate(ROUTES.learnSubtopics(subjectId, topic.id))}
                className="hover:bg-muted flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CircularProgress
                    value={topic.progressPercent}
                    size={30}
                    strokeWidth={3}
                  >
                    {topic.isComplete && (
                      <Check className="text-success size-3.5" aria-hidden="true" />
                    )}
                  </CircularProgress>
                  <div className="flex flex-col">
                    <Text as="span" variant="body-md" className="font-medium">
                      {topic.name}
                    </Text>
                    <Text variant="caption">
                      {t('topicList.subtopicCount', { count: topic.subtopicCount })}
                    </Text>
                  </div>
                </div>
                <ChevronRight
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden="true"
                />
              </button>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
