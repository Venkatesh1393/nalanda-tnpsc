import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import type { MyLiveExamAttempt } from '@/types/liveExam'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type MyAttemptCardProps = {
  attempt: MyLiveExamAttempt
}

/** One row in the "My Attempts" tab — routes to the live session if still
 * in progress, otherwise to the result screen (which itself renders the
 * "not published yet" state honestly if `resultAvailable` is false). */
export function MyAttemptCard({ attempt }: MyAttemptCardProps) {
  const { t } = useTranslation('liveExams')
  const navigate = useNavigate()
  const destination =
    attempt.status === 'in-progress'
      ? ROUTES.liveExamSession(attempt.liveExamId)
      : ROUTES.liveExamResult(attempt.liveExamId)

  return (
    <Card interactive className="cursor-pointer" onClick={() => navigate(destination)}>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex flex-col gap-1">
          <Text variant="body-md" className="font-medium">
            {attempt.examTitle}
          </Text>
          <Text variant="caption">
            {attempt.status === 'in-progress'
              ? t('myAttemptCard.started', { date: formatDate(attempt.startedAt) })
              : t('myAttemptCard.submitted', {
                  date: attempt.submittedAt ? formatDate(attempt.submittedAt) : '',
                })}
          </Text>
        </div>
        <div className="flex items-center gap-2">
          {attempt.status === 'in-progress' ? (
            <Badge variant="warning">{t('myAttemptCard.inProgress')}</Badge>
          ) : attempt.resultAvailable ? (
            <Badge variant="success">
              {attempt.score} / {attempt.totalMarks}
            </Badge>
          ) : (
            <Badge variant="outline">{t('myAttemptCard.resultPending')}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
