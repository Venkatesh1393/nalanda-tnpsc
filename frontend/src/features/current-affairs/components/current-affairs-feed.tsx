import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Newspaper } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { staggerChildren } from '@/animations/variants'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ArticleCard } from '@/features/current-affairs/components/article-card'
import {
  CategoryFilter,
  type CategoryFilterValue,
} from '@/features/current-affairs/components/category-filter'
import { getCurrentAffairsList } from '@/services/currentAffairsService'
import { toggleBookmark } from '@/services/learnProgressService'
import type { CurrentAffairsItem, CurrentAffairsPeriod } from '@/types/currentAffairs'

type CurrentAffairsFeedProps = {
  period: CurrentAffairsPeriod
}

/**
 * The Daily/Weekly feed (docs/InformationArchitecture.md §7.9) — category
 * filter chips above a chronological list of `ArticleCard`s. Bookmark
 * toggling is owned here (not inside `ArticleCard`) so it can invalidate
 * both this feed's own query and the shared `['learn']` bookmark store in
 * one mutation, the same ownership split `features/learn/components/
 * subtopic-list.tsx` already establishes.
 */
export function CurrentAffairsFeed({ period }: CurrentAffairsFeedProps) {
  const { t } = useTranslation('currentAffairs')
  const queryClient = useQueryClient()
  const [category, setCategory] = useState<CategoryFilterValue>('all')
  const queryKey = ['current-affairs', 'list', period, category]
  const emptyCopy: Record<CurrentAffairsPeriod, string> = {
    daily: t('currentAffairsFeed.empty.daily'),
    weekly: t('currentAffairsFeed.empty.weekly'),
    monthly: t('currentAffairsFeed.empty.monthly'),
  }

  const {
    data: articles,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () =>
      getCurrentAffairsList({
        period,
        category: category === 'all' ? undefined : category,
      }),
  })

  const bookmarkMutation = useMutation({
    mutationFn: (article: CurrentAffairsItem) =>
      toggleBookmark({
        subtopicId: article.id,
        contentType: 'current-affairs',
        title: article.title,
        subjectName: 'Current Affairs',
        topicName: t(`categories.${article.category}`),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['current-affairs'] })
      void queryClient.invalidateQueries({ queryKey: ['learn'] })
    },
  })

  if (isError) {
    return (
      <ErrorState
        title={t('currentAffairsFeed.errorTitle')}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <CategoryFilter value={category} onChange={setCategory} />

      {!articles ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <EmptyState icon={Newspaper} title={emptyCopy[period]} />
      ) : (
        <motion.ul
          variants={staggerChildren(0.05)}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3"
        >
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              bookmarkPending={
                bookmarkMutation.isPending &&
                bookmarkMutation.variables?.id === article.id
              }
              onToggleBookmark={(a) => bookmarkMutation.mutate(a)}
            />
          ))}
        </motion.ul>
      )}
    </div>
  )
}
