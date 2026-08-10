import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import type { LiveExamEffectiveStatus, LiveExamListItem } from '@/types/liveExam'

function formatSchedule(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const STATUS_BADGE_VARIANT: Record<
  LiveExamEffectiveStatus,
  'success' | 'warning' | 'outline' | 'destructive'
> = {
  upcoming: 'outline',
  live: 'success',
  completed: 'outline',
  cancelled: 'destructive',
}

type LiveExamCardProps = {
  exam: LiveExamListItem
}

/** One exam's summary row, reused across the Upcoming/Live/Completed tabs
 * (`pages/live-exams/live-exams-page.tsx`) — the effective (server-time-
 * computed) status badge, not the raw stored `status`, drives the visible
 * label/color. */
export function LiveExamCard({ exam }: LiveExamCardProps) {
  const { t } = useTranslation('liveExams')
  const navigate = useNavigate()
  const statusVariant = STATUS_BADGE_VARIANT[exam.effectiveStatus]
  const statusLabel = t(`liveExamCard.status.${exam.effectiveStatus}`)

  return (
    <Card
      interactive
      className="cursor-pointer"
      onClick={() => navigate(ROUTES.liveExamDetail(exam.id))}
    >
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Heading variant="heading-4">{exam.title}</Heading>
          <Text variant="body-sm">{exam.description}</Text>
        </div>
        <Badge
          variant={statusVariant}
          className={exam.effectiveStatus === 'live' ? 'animate-pulse' : undefined}
        >
          {statusLabel}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {exam.subjectNames.length > 0 && (
          <Badge variant="outline">{exam.subjectNames.join(', ')}</Badge>
        )}
        <Text variant="caption">{formatSchedule(exam.scheduledStartAt)}</Text>
        <Text variant="caption">
          {t('liveExamCard.questionsMarks', {
            questions: exam.totalQuestions,
            marks: exam.totalMarks,
          })}
        </Text>
        {exam.myAttemptStatus && (
          <Badge variant="secondary">
            {exam.myAttemptStatus === 'submitted'
              ? t('liveExamCard.attempted')
              : t('liveExamCard.inProgress')}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
