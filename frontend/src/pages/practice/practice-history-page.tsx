import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getPracticeHistory } from '@/services/practiceSessionService'

/** `/app/practice/history` (Step 46 §15) — completed Topic Quiz sessions,
 * newest first, paginated against the real `GET /practice/history`. Only
 * covers the real-backend quiz mode; the still-mocked Sectional/Mock/PYQ/
 * 100 Questions sessions never leave this browser, so they have nothing to
 * list here. */
export function PracticeHistoryPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { t } = useTranslation(['common', 'practice'])

  const { data, isError, isLoading, refetch } = useQuery({
    queryKey: ['practice', 'history', page],
    queryFn: () => getPracticeHistory({ page, limit: 10 }),
  })

  if (isError) {
    return (
      <ErrorState
        title={t('practice:practiceHistoryPage.errorTitle')}
        onRetry={() => void refetch()}
      />
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        title={t('practice:practiceHistoryPage.emptyTitle')}
        description={t('practice:practiceHistoryPage.emptyDescription')}
        actionLabel={t('practice:practiceHistoryPage.startPracticing')}
        onAction={() => navigate(ROUTES.practice('quiz'))}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Heading variant="heading-2">{t('practice:practiceHistoryPage.heading')}</Heading>

      <div className="flex flex-col gap-3">
        {data.items.map((item) => (
          <Card
            key={item.sessionId}
            interactive
            className="cursor-pointer"
            onClick={() => navigate(ROUTES.practiceSummary(item.sessionId))}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex flex-col gap-1">
                <Text variant="body-md" className="font-medium">
                  {item.subjectName} · {item.topicName}
                </Text>
                <Text variant="caption">
                  {new Date(item.submittedAt).toLocaleString()}
                </Text>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">
                  {t('practice:practiceHistoryPage.correctCount', {
                    correct: item.correctCount,
                    total: item.totalQuestions,
                  })}
                </Badge>
                <Badge variant={item.accuracyPercent >= 70 ? 'success' : 'outline'}>
                  {item.accuracyPercent}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            {t('common:pagination.previous')}
          </Button>
          <Text variant="caption">
            {t('common:dataTable.pageOf', { current: data.page, total: data.totalPages })}
          </Text>
          <Button
            variant="outline"
            disabled={page >= data.totalPages}
            onClick={() => setPage((current) => Math.min(data.totalPages, current + 1))}
          >
            {t('common:pagination.next')}
          </Button>
        </div>
      )}
    </div>
  )
}
