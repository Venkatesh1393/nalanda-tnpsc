import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { fadeInUp } from '@/animations/variants'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ArticleDetail } from '@/features/current-affairs'
import { ROUTES } from '@/constants/routes'
import { getCurrentAffairsDetail } from '@/services/currentAffairsService'
import { markAsRead, updateReadProgress } from '@/services/currentAffairsProgressService'
import { toggleBookmark } from '@/services/learnProgressService'
import type { CurrentAffairsItem } from '@/types/currentAffairs'

/** `/app/current-affairs/article/:id` — a single article's full reading
 * view. Read-progress updates are applied optimistically to the query
 * cache (`setQueryData`) rather than invalidated on every scroll tick,
 * exactly the pattern `pages/practice/practice-session-page.tsx` already
 * established for high-frequency in-session updates. */
export function ArticleDetailPage() {
  const { t } = useTranslation('currentAffairs')
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const queryKey = ['current-affairs', 'detail', id]

  const {
    data: article,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => getCurrentAffairsDetail(id!),
    enabled: Boolean(id),
  })

  const bookmarkMutation = useMutation({
    mutationFn: () =>
      toggleBookmark({
        subtopicId: article!.id,
        contentType: 'current-affairs',
        title: article!.title,
        subjectName: 'Current Affairs',
        topicName: t(`categories.${article!.category}`),
      }),
    onSuccess: (nowBookmarked) => {
      queryClient.setQueryData<CurrentAffairsItem | null>(queryKey, (prev) =>
        prev ? { ...prev, isBookmarked: nowBookmarked } : prev,
      )
      void queryClient.invalidateQueries({ queryKey: ['learn'] })
      void queryClient.invalidateQueries({ queryKey: ['current-affairs', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['current-affairs', 'archive'] })
    },
  })

  const markReadMutation = useMutation({
    mutationFn: () => markAsRead(article!.id),
    onSuccess: () => {
      queryClient.setQueryData<CurrentAffairsItem | null>(queryKey, (prev) =>
        prev ? { ...prev, readProgressPercent: 100 } : prev,
      )
    },
  })

  function handleReadProgressChange(percent: number) {
    if (!article || percent <= article.readProgressPercent) return
    void updateReadProgress(article.id, percent)
    queryClient.setQueryData<CurrentAffairsItem | null>(queryKey, (prev) =>
      prev ? { ...prev, readProgressPercent: percent } : prev,
    )
  }

  if (isError) {
    return (
      <ErrorState
        title={t('articleDetailPage.errorTitle')}
        onRetry={() => void refetch()}
      />
    )
  }

  if (article === null) {
    return (
      <EmptyState
        title={t('articleDetailPage.notFound.title')}
        description={t('articleDetailPage.notFound.description')}
        actionLabel={t('articleDetailPage.notFound.actionLabel')}
        onAction={() => navigate(ROUTES.currentAffairs('daily'))}
      />
    )
  }

  if (!article) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-9 w-full" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-4"
    >
      <Link
        to={ROUTES.currentAffairs(article.period)}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t('articleDetailPage.backLink')}
      </Link>
      <ArticleDetail
        article={article}
        bookmarkPending={bookmarkMutation.isPending}
        onToggleBookmark={() => bookmarkMutation.mutate()}
        onReadProgressChange={handleReadProgressChange}
        isMarkingRead={markReadMutation.isPending}
        onMarkAsRead={() => markReadMutation.mutate()}
      />
    </motion.div>
  )
}
