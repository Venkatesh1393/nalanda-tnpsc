import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PremiumCard } from '@/components/premium-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { Countdown } from '@/features/live-exams'
import { useAuth } from '@/hooks/use-auth'
import { getLiveExamDetail, joinLiveExam } from '@/services/liveExamService'

function formatSchedule(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** `/app/live-exams/exam/:liveExamId` — schedule, instructions, marking
 * scheme, and the single entry point into a session (Step 48 §"View
 * upcoming exam / See countdown / Read instructions / Start exam"). */
export function LiveExamDetailPage() {
  const { t } = useTranslation('liveExams')
  const { liveExamId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isPremiumEntitled = Boolean(user) && user?.subscriptionTier !== 'free'

  const queryKey = ['live-exams', 'detail', liveExamId]
  const {
    data: exam,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => getLiveExamDetail(liveExamId),
  })

  const joinMutation = useMutation({
    mutationFn: () => joinLiveExam(liveExamId),
    onSuccess: () => {
      navigate(ROUTES.liveExamSession(liveExamId))
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        toast.error(t('detail.joinErrorTitle'), {
          description:
            error.response.data?.error?.message ?? t('detail.joinErrorFallback'),
        })
        return
      }
      toast.error(t('detail.joinErrorGeneric'))
    },
  })

  if (isError) {
    return (
      <ErrorState title={t('detail.errorTitle')} onRetry={() => void refetch()} />
    )
  }

  if (exam === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (exam === null) {
    return (
      <EmptyState
        title={t('detail.notFoundTitle')}
        actionLabel={t('detail.backToLiveExams')}
        onAction={() => navigate(ROUTES.liveExams('upcoming'))}
      />
    )
  }

  const startButton = (
    <Button
      size="lg"
      loading={joinMutation.isPending}
      onClick={() => joinMutation.mutate()}
    >
      {exam.myAttemptStatus === 'in-progress' ? t('detail.resumeExam') : t('detail.startExam')}
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{exam.examCategory.toUpperCase()}</Badge>
          {exam.subjectNames.map((name) => (
            <Badge key={name} variant="outline">
              {name}
            </Badge>
          ))}
        </div>
        <Heading variant="heading-2">{exam.title}</Heading>
        <Text variant="body-md">{exam.description}</Text>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Text variant="caption">{t('detail.scheduled')}</Text>
            <Text variant="body-sm" className="font-medium">
              {formatSchedule(exam.scheduledStartAt)} –{' '}
              {formatSchedule(exam.scheduledEndAt)}
            </Text>
          </div>
          {exam.effectiveStatus === 'upcoming' && (
            <Countdown
              targetIso={exam.scheduledStartAt}
              serverTimeIso={exam.serverTime}
              onComplete={() => void queryClient.invalidateQueries({ queryKey })}
            />
          )}
          {exam.effectiveStatus === 'live' && (
            <Badge variant="success" className="animate-pulse">
              {t('detail.liveNow')}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <Text variant="caption">{t('detail.duration')}</Text>
            <Text variant="body-sm" className="font-medium">
              {t('detail.durationValue', { minutes: exam.durationMinutes })}
            </Text>
          </div>
          <div className="flex flex-col gap-0.5">
            <Text variant="caption">{t('detail.questions')}</Text>
            <Text variant="body-sm" className="font-medium">
              {exam.totalQuestions}
            </Text>
          </div>
          <div className="flex flex-col gap-0.5">
            <Text variant="caption">{t('detail.totalMarks')}</Text>
            <Text variant="body-sm" className="font-medium">
              {exam.totalMarks}
            </Text>
          </div>
          <div className="flex flex-col gap-0.5">
            <Text variant="caption">{t('detail.negativeMarking')}</Text>
            <Text variant="body-sm" className="font-medium">
              {exam.negativeMarking.enabled
                ? t('detail.negativeMarkingValue', {
                    marks: exam.negativeMarking.marksPerWrongAnswer,
                  })
                : t('detail.negativeMarkingNone')}
            </Text>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Heading variant="heading-4">{t('detail.instructions')}</Heading>
        </CardHeader>
        <CardContent>
          <ul className="flex list-inside list-disc flex-col gap-2">
            {exam.instructions.map((line) => (
              <li key={line}>
                <Text as="span" variant="body-sm">
                  {line}
                </Text>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {exam.effectiveStatus === 'cancelled' ? (
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-destructive size-4" aria-hidden="true" />
            <Text variant="body-sm">{t('detail.cancelled')}</Text>
          </div>
        ) : exam.myAttemptStatus === 'submitted' ? (
          <Button size="lg" onClick={() => navigate(ROUTES.liveExamResult(liveExamId))}>
            {t('detail.viewResult')}
          </Button>
        ) : exam.effectiveStatus === 'upcoming' ? (
          <Text variant="body-sm">{t('detail.upcomingNote')}</Text>
        ) : exam.effectiveStatus === 'completed' ? (
          <Text variant="body-sm">{t('detail.windowClosed')}</Text>
        ) : !isPremiumEntitled ? (
          <PremiumCard
            unlockLabel={t('detail.premiumUnlock')}
            onUnlock={() => navigate(ROUTES.subscription)}
          >
            {startButton}
          </PremiumCard>
        ) : (
          startButton
        )}
      </div>
    </div>
  )
}
