import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronRight, FileText, Video } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, motionFast, staggerChildren } from '@/animations/variants'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { ToggleChip } from '@/components/inputs/toggle-chip'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { BookmarkToggleButton } from '@/features/learn/components/bookmark-toggle-button'
import { getSubtopics } from '@/services/learnService'
import { toggleBookmark } from '@/services/learnProgressService'
import { cn } from '@/lib/utils'
import type { LearnSubtopic } from '@/types/learn'

type SubtopicFilter = 'all' | 'video' | 'notes' | 'bookmarked' | 'completed'

const FILTERS: { value: SubtopicFilter; labelKey: SubtopicFilter }[] = [
  { value: 'all', labelKey: 'all' },
  { value: 'video', labelKey: 'video' },
  { value: 'notes', labelKey: 'notes' },
  { value: 'bookmarked', labelKey: 'bookmarked' },
  { value: 'completed', labelKey: 'completed' },
]

type SubtopicListProps = {
  subjectId: string
  topicId: string
  subjectName: string
  topicName: string
}

/**
 * The Subtopics list (docs/Learn_Module.md §3) — the atomic unit of the
 * syllabus, and the first level where bookmarking and content consumption
 * genuinely begin. A subtopic with no content yet stays visible but muted
 * (grayed icons) rather than hidden, preserving the full scope of the
 * syllabus even before every piece of content is published.
 */
export function SubtopicList({
  subjectId,
  topicId,
  subjectName,
  topicName,
}: SubtopicListProps) {
  const { t } = useTranslation('learn')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<SubtopicFilter>('all')
  const queryKey = ['learn', 'subtopics', subjectId, topicId]
  const {
    data: subtopics,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => getSubtopics(subjectId, topicId),
  })

  const bookmarkMutation = useMutation({
    mutationFn: (subtopic: LearnSubtopic) =>
      toggleBookmark({
        subtopicId: subtopic.id,
        contentType: subtopic.hasNotes ? 'note' : 'video',
        title: subtopic.name,
        subjectName,
        topicName,
        subjectId,
        topicId,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['learn'] }),
  })

  if (isError) {
    return (
      <ErrorState title={t('subtopicList.errorTitle')} onRetry={() => void refetch()} />
    )
  }

  const filtered = subtopics?.filter((subtopic) => {
    if (filter === 'video') return subtopic.hasVideo
    if (filter === 'notes') return subtopic.hasNotes
    if (filter === 'bookmarked') return subtopic.isBookmarked
    if (filter === 'completed') return subtopic.isComplete
    return true
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <ToggleChip
            key={option.value}
            role="radio"
            label={t(`subtopicList.filters.${option.labelKey}`)}
            selected={filter === option.value}
            onSelect={() => setFilter(option.value)}
          />
        ))}
      </div>

      {!subtopics ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered && filtered.length === 0 ? (
        <EmptyState
          title={t('subtopicList.emptyTitle')}
          actionLabel={t('subtopicList.showAll')}
          onAction={() => setFilter('all')}
        />
      ) : (
        <motion.ul
          variants={staggerChildren(0.04)}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-2"
        >
          {filtered?.map((subtopic) => (
            <motion.li
              key={subtopic.id}
              variants={fadeInUp}
              layout
              transition={motionFast}
            >
              <div className="hover:bg-muted flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors">
                <button
                  type="button"
                  onClick={() =>
                    navigate(ROUTES.learnLesson(subjectId, topicId, subtopic.id))
                  }
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  {subtopic.isComplete ? (
                    <span className="bg-success/10 text-success flex size-8 shrink-0 items-center justify-center rounded-full">
                      <Check className="size-4" aria-hidden="true" />
                    </span>
                  ) : (
                    <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                      <Video
                        className={cn(
                          'size-3.5',
                          subtopic.hasVideo
                            ? 'text-foreground'
                            : 'text-muted-foreground/40',
                        )}
                        aria-hidden="true"
                      />
                    </span>
                  )}
                  <div className="flex flex-col">
                    <Text as="span" variant="body-md" className="font-medium">
                      {subtopic.name}
                    </Text>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Video
                        className={cn('size-3.5', !subtopic.hasVideo && 'opacity-30')}
                        aria-hidden="true"
                      />
                      <FileText
                        className={cn('size-3.5', !subtopic.hasNotes && 'opacity-30')}
                        aria-hidden="true"
                      />
                      <span>{t('subtopicList.minutes', { minutes: subtopic.estimatedMinutes })}</span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <BookmarkToggleButton
                    label={subtopic.name}
                    isBookmarked={subtopic.isBookmarked}
                    pending={bookmarkMutation.isPending}
                    onToggle={() => bookmarkMutation.mutate(subtopic)}
                  />
                  <ChevronRight
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
