import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import { ScoreRing } from '@/components/charts/score-ring'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { QuestionCard } from '@/components/question-card'
import { StatCard } from '@/components/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { Countdown } from '@/features/live-exams'
import { getLiveExamResult } from '@/services/liveExamService'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** `/app/live-exams/exam/:liveExamId/result` — gated entirely by
 * `resultPublication` rules (Step 48's "view result only when result
 * publication rules allow"): before that moment, this renders an honest
 * "not published yet" state with a live countdown, never a partial or
 * fabricated score. */
export function LiveExamResultPage() {
  const { t } = useTranslation('liveExams')
  const { liveExamId = '' } = useParams()
  const navigate = useNavigate()

  const { data, isError, isLoading, refetch } = useQuery({
    queryKey: ['live-exams', 'result', liveExamId],
    queryFn: () => getLiveExamResult(liveExamId),
  })

  function formatTimeTaken(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return t('result.timeTaken', { minutes, seconds })
  }

  if (isError) {
    return <ErrorState title={t('result.errorTitle')} onRetry={() => void refetch()} />
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  if (!data.available || !data.result) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <Heading variant="heading-3">{t('result.notPublishedTitle')}</Heading>
          <Text variant="body-sm">
            {t('result.notPublishedDescription', { date: formatDate(data.publishAt) })}
          </Text>
          <Countdown targetIso={data.publishAt} serverTimeIso={data.serverTime} />
          <Button
            variant="outline"
            onClick={() => navigate(ROUTES.liveExams('my-attempts'))}
          >
            {t('result.backToMyAttempts')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { result } = data

  return (
    <div className="flex flex-col gap-6">
      <Heading variant="heading-2">{t('result.heading')}</Heading>

      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-4 sm:flex-row sm:justify-around">
          <div className="flex flex-col items-center gap-2">
            <ScoreRing value={result.accuracyPercent} label={t('result.accuracy')} size={140} />
            <Text variant="body-sm">
              {t('result.correctOfTotal', {
                correct: result.correctCount,
                total: result.totalQuestions,
                time: formatTimeTaken(result.timeTakenSeconds),
              })}
            </Text>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Text variant="caption">{t('result.score')}</Text>
            <Heading variant="heading-1" className="tabular-nums">
              {result.score} / {result.totalMarks}
            </Heading>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t('result.stats.correct')}
          value={String(result.correctCount)}
          icon={CheckCircle2}
        />
        <StatCard
          label={t('result.stats.incorrect')}
          value={String(result.incorrectCount)}
          icon={XCircle}
        />
        <StatCard
          label={t('result.stats.unanswered')}
          value={String(result.unansweredCount)}
          icon={Circle}
        />
      </div>

      <div className="flex flex-col gap-4">
        <Heading variant="heading-3">{t('result.review')}</Heading>
        {result.questions.length === 0 ? (
          <EmptyState title={t('result.noQuestionsToReview')} />
        ) : (
          result.questions.map((question, index) => (
            <div key={question.questionId} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Text variant="caption">{t('result.questionNumber', { number: index + 1 })}</Text>
                <Badge
                  variant={
                    question.isCorrect
                      ? 'success'
                      : question.selectedOptionId
                        ? 'destructive'
                        : 'outline'
                  }
                >
                  {question.isCorrect
                    ? t('result.questionStatus.correct')
                    : question.selectedOptionId
                      ? t('result.questionStatus.incorrect')
                      : t('result.questionStatus.skipped')}
                </Badge>
              </div>
              <QuestionCard
                questionText={question.questionText}
                options={question.options}
                selectedOptionId={question.selectedOptionId ?? undefined}
                correctOptionId={question.correctOptionId}
                disabled
              />
              <Text variant="body-sm" className="text-muted-foreground">
                {question.explanation}
              </Text>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => navigate(ROUTES.liveExams('my-attempts'))}
        >
          {t('tabs.myAttempts')}
        </Button>
        <Button variant="ghost" onClick={() => navigate(ROUTES.dashboard)}>
          {t('page.backToDashboard')}
        </Button>
      </div>
    </div>
  )
}
