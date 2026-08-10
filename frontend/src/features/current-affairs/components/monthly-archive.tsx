import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Newspaper } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { staggerChildren } from '@/animations/variants'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { ToggleChip } from '@/components/inputs/toggle-chip'
import { Skeleton } from '@/components/ui/skeleton'
import { ArticleCard } from '@/features/current-affairs/components/article-card'
import { getArchiveForMonth, getArchiveMonths } from '@/services/currentAffairsService'
import { toggleBookmark } from '@/services/learnProgressService'
import type { CurrentAffairsItem } from '@/types/currentAffairs'

/**
 * Monthly Archive — a month picker (every calendar month that has at least
 * one published article, most recent first) plus that month's full article
 * list. Distinct from the Monthly period feed's "capsule" entries
 * (`CurrentAffairsFeed period="monthly"`): this is a browsable archive
 * across *everything* published in a given month, the way "monthly
 * archive" is normally understood.
 */
export function MonthlyArchive() {
  const { t } = useTranslation('currentAffairs')
  const queryClient = useQueryClient()
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const {
    data: months,
    isError: monthsError,
    refetch: refetchMonths,
  } = useQuery({
    queryKey: ['current-affairs', 'archive-months'],
    queryFn: getArchiveMonths,
  })

  // Derived at render time rather than synced via an effect+setState (which
  // would cascade an extra render every time `months` resolves) — the most
  // recent month is the default until the user explicitly picks another.
  const activeMonth = selectedMonth ?? months?.[0]?.key ?? null

  const {
    data: articles,
    isError: articlesError,
    refetch: refetchArticles,
  } = useQuery({
    queryKey: ['current-affairs', 'archive', activeMonth],
    queryFn: () => getArchiveForMonth(activeMonth!),
    enabled: Boolean(activeMonth),
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

  if (monthsError) {
    return (
      <ErrorState
        title={t('monthlyArchive.loadArchiveError')}
        onRetry={() => void refetchMonths()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {!months ? (
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-full" />
          ))}
        </div>
      ) : months.length === 0 ? (
        <EmptyState icon={Newspaper} title={t('monthlyArchive.noMonths')} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {months.map((month) => (
            <ToggleChip
              key={month.key}
              role="radio"
              label={t('monthlyArchive.monthLabel', {
                label: month.label,
                count: month.count,
              })}
              selected={activeMonth === month.key}
              onSelect={() => setSelectedMonth(month.key)}
            />
          ))}
        </div>
      )}

      {articlesError ? (
        <ErrorState
          title={t('monthlyArchive.loadMonthError')}
          onRetry={() => void refetchArticles()}
        />
      ) : !articles ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <EmptyState icon={Newspaper} title={t('monthlyArchive.noArticlesForMonth')} />
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
