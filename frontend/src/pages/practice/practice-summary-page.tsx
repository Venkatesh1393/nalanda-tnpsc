import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import {
  AchievementUnlockBanner,
  MODE_META,
  PracticeSummaryCard,
} from '@/features/practice'
import { getResult, getSession } from '@/services/practiceSessionService'

/** `/app/practice/session/:sessionId/summary` — the immediate post-
 * submission score (docs/UserJourney.md Screen 7's `/result`), distinct
 * from the deliberate Review mode it links onward to. */
export function PracticeSummaryPage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation(['practice'])

  const {
    data: result,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['practice', 'result', sessionId],
    queryFn: () => getResult(sessionId),
  })
  const { data: session } = useQuery({
    queryKey: ['practice', 'session', sessionId],
    queryFn: () => getSession(sessionId),
  })

  if (isError) {
    return (
      <ErrorState
        title={t('practiceSummaryPage.errorTitle')}
        onRetry={() => void refetch()}
      />
    )
  }

  if (result === undefined || session === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  if (result === null) {
    return (
      <EmptyState
        title={t('practiceSummaryPage.emptyTitle')}
        description={t('practiceSummaryPage.emptyDescription')}
        actionLabel={t('shared.backToDashboard')}
        onAction={() => navigate(ROUTES.dashboard)}
      />
    )
  }

  const subjectName = result.subjectName ?? session?.subjectName
  const topicName = result.topicName ?? session?.topicName
  const performanceLabel =
    result.accuracyPercent >= 80
      ? t('practiceSummaryPage.performance.excellent')
      : result.accuracyPercent >= 60
        ? t('practiceSummaryPage.performance.good')
        : result.accuracyPercent >= 40
          ? t('practiceSummaryPage.performance.fair')
          : t('practiceSummaryPage.performance.needsImprovement')
  const performanceVariant =
    result.accuracyPercent >= 60
      ? 'success'
      : result.accuracyPercent >= 40
        ? 'outline'
        : 'destructive'
  const modeTitle = session
    ? t(MODE_META[session.mode].titleKey)
    : t('practiceSummaryPage.practiceFallback')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Heading variant="heading-2">
          {t('practiceSummaryPage.summaryHeading', { modeTitle })}
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="body-sm">{t('practiceSummaryPage.submittedSubtitle')}</Text>
          {(subjectName || topicName) && (
            <Badge variant="outline">
              {subjectName}
              {subjectName && topicName ? ' · ' : ''}
              {topicName}
            </Badge>
          )}
          <Badge variant={performanceVariant}>{performanceLabel}</Badge>
        </div>
      </div>

      <AchievementUnlockBanner achievementIds={result.newlyUnlockedAchievementIds} />

      <PracticeSummaryCard result={result} />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate(ROUTES.practiceReview(sessionId))}>
          {t('practiceSummaryPage.reviewAnswers')}
        </Button>
        {session && (
          <Button
            variant="outline"
            onClick={() => navigate(ROUTES.practice(session.mode))}
          >
            {t('practiceSummaryPage.practiceAgain')}
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate(ROUTES.analytics)}>
          {t('practiceSummaryPage.goToAnalytics')}
        </Button>
        <Button variant="ghost" onClick={() => navigate(ROUTES.practiceHistory)}>
          {t('practiceSummaryPage.practiceHistory')}
        </Button>
        <Button variant="ghost" onClick={() => navigate(ROUTES.dashboard)}>
          {t('shared.backToDashboard')}
        </Button>
      </div>
    </div>
  )
}
