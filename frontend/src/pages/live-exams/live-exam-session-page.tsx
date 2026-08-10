import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { LiveExamQuestionPanel } from '@/features/live-exams'
import {
  QuestionPalette,
  QuestionTimer,
  type PaletteItemState,
} from '@/features/practice'
import {
  finishLiveExam,
  getLiveExamAttempt,
  saveLiveExamAnswer,
} from '@/services/liveExamService'
import type { LiveExamAnswer, LiveExamAttemptState } from '@/types/liveExam'

/**
 * The live, hard-timed exam-taking screen (Step 48). Reuses
 * `features/practice`'s `QuestionTimer`/`QuestionPalette` directly — Live
 * Exams deliberately share Practice's test-taking mechanics
 * (docs/InformationArchitecture.md §7.10) while staying a distinct module.
 * Unlike Practice's Topic Quiz, nothing here ever reveals correctness —
 * there is no "adaptive"/immediate-feedback branch at all.
 */
export function LiveExamSessionPage() {
  const { t } = useTranslation('liveExams')
  const { liveExamId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [currentIndex, setCurrentIndex] = useState(0)

  const queryKey = ['live-exams', 'attempt', liveExamId]
  const {
    data: attempt,
    isError,
    refetch,
  } = useQuery({ queryKey, queryFn: () => getLiveExamAttempt(liveExamId) })

  const questions = attempt?.questions ?? []
  const currentQuestion = questions[currentIndex]

  const finishMutation = useMutation({
    mutationFn: () => finishLiveExam(liveExamId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      navigate(ROUTES.liveExamResult(liveExamId))
    },
  })

  async function updateAnswer(
    questionId: string,
    patch: Partial<Pick<LiveExamAnswer, 'selectedOptionId' | 'markedForReview'>>,
  ) {
    queryClient.setQueryData<LiveExamAttemptState>(queryKey, (previous) => {
      if (!previous) return previous
      const existing: LiveExamAnswer = previous.answers.find(
        (a) => a.questionId === questionId,
      ) ?? { questionId, selectedOptionId: null, markedForReview: false }
      const updated = { ...existing, ...patch }
      return {
        ...previous,
        answers: [
          ...previous.answers.filter((a) => a.questionId !== questionId),
          updated,
        ],
      }
    })
    await saveLiveExamAnswer(liveExamId, { questionId, ...patch })
  }

  function goTo(index: number) {
    setCurrentIndex(Math.min(Math.max(index, 0), questions.length - 1))
  }

  function handleExpire() {
    toast.message(t('session.timeUpToast'))
    finishMutation.mutate()
  }

  if (isError) {
    return (
      <ErrorState title={t('session.errorTitle')} onRetry={() => void refetch()} />
    )
  }

  if (attempt === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  if (attempt.status === 'submitted') {
    return <Navigate to={ROUTES.liveExamResult(liveExamId)} replace />
  }

  if (!currentQuestion) return null

  const answer: LiveExamAnswer = attempt.answers.find(
    (a) => a.questionId === currentQuestion.id,
  ) ?? { questionId: currentQuestion.id, selectedOptionId: null, markedForReview: false }
  const answeredCount = attempt.answers.filter((a) => a.selectedOptionId !== null).length
  const durationSeconds = Math.max(
    0,
    Math.round(
      (new Date(attempt.deadlineAt).getTime() - new Date(attempt.startedAt).getTime()) /
        1000,
    ),
  )

  function getPaletteState(index: number): PaletteItemState {
    const question = questions[index]
    const questionAnswer = attempt?.answers.find((a) => a.questionId === question.id)
    if (questionAnswer?.markedForReview) return 'marked'
    if (questionAnswer?.selectedOptionId) return 'answered'
    return 'unanswered'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Text variant="caption">{t('session.label')}</Text>
          <Text variant="body-sm" className="font-medium">
            {t('session.questionOf', { current: currentIndex + 1, total: questions.length })}
          </Text>
        </div>
        <QuestionTimer
          timerType="hard"
          durationSeconds={durationSeconds}
          startedAt={attempt.startedAt}
          isActive={attempt.status === 'in-progress' && !finishMutation.isPending}
          onExpire={handleExpire}
        />
      </div>

      <Progress
        value={((currentIndex + 1) / questions.length) * 100}
        aria-label={t('session.progressAriaLabel')}
        className="h-1.5"
      />

      <LiveExamQuestionPanel
        key={currentQuestion.id}
        question={currentQuestion}
        answer={answer}
        onSelectOption={(optionId) =>
          void updateAnswer(currentQuestion.id, { selectedOptionId: optionId })
        }
        onToggleMarkForReview={() =>
          void updateAnswer(currentQuestion.id, {
            markedForReview: !answer.markedForReview,
          })
        }
      />

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <ChevronLeft />
          {t('session.previous')}
        </Button>
        {currentIndex === questions.length - 1 ? (
          <Button
            loading={finishMutation.isPending}
            onClick={() => finishMutation.mutate()}
          >
            {t('session.submitExam')}
          </Button>
        ) : (
          <Button onClick={() => goTo(currentIndex + 1)}>
            {t('session.next')}
            <ChevronRight />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="flex items-center justify-between gap-2">
          <Text variant="caption">
            {t('session.answeredCount', { answered: answeredCount, total: questions.length })}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            loading={finishMutation.isPending}
            onClick={() => finishMutation.mutate()}
          >
            {t('session.submitExam')}
          </Button>
        </div>
        <QuestionPalette
          count={questions.length}
          currentIndex={currentIndex}
          getState={getPaletteState}
          onJump={goTo}
        />
      </div>
    </div>
  )
}
