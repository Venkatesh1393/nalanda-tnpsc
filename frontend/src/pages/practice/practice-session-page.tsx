import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import {
  MODE_META,
  PracticeQuestionPanel,
  QuestionPalette,
  QuestionTimer,
  type PaletteItemState,
} from '@/features/practice'
import { isContentBookmarked, toggleBookmark } from '@/services/learnProgressService'
import { getMySubscription } from '@/services/paymentsService'
import {
  getSession,
  getSessionQuestions,
  saveAnswer,
  submitSession,
} from '@/services/practiceSessionService'
import { isAdaptiveMode } from '@/types/practice'
import type { PracticeAnswer, PracticeQuestion, PracticeSession } from '@/types/practice'

/**
 * The live practice-taking screen. The session lives in the React Query
 * cache (not a parallel `useState` mirror) — every interaction
 * (answer/mark-for-review/hint) writes straight to the cache via
 * `queryClient.setQueryData` from the event handler that caused it, then
 * fires a background autosave (`saveAnswer`, mirroring `docs/API.md` §6's
 * "invoked on every answer change"). Nothing here needs an effect: the
 * initial load is a plain `useQuery`, and an already-submitted session
 * redirects declaratively via `<Navigate>` rather than an imperative
 * effect-based redirect.
 */
export function PracticeSessionPage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // Backend-authoritative (Sprint 4 Step 55's entitlement engine) — never
  // re-derived from a raw `subscriptionTier` comparison, since the actual
  // feature-to-plan mapping lives server-side in `config/plans.config.ts`.
  const { data: subscription } = useQuery({
    queryKey: ['payments', 'subscription'],
    queryFn: getMySubscription,
  })
  const isPremiumEntitled = subscription?.entitlements.ai_explanations ?? false
  const [currentIndex, setCurrentIndex] = useState(0)
  const { t } = useTranslation(['common', 'practice'])

  // Real-backend answer submission wants a per-question response time
  // (Step 46 §6) — reset every time the visible question changes.
  const questionShownAtRef = useRef<number>(0)
  useEffect(() => {
    questionShownAtRef.current = Date.now()
  }, [currentIndex])

  const queryKey = ['practice', 'session', sessionId]
  const {
    data: session,
    isError,
    refetch,
  } = useQuery({ queryKey, queryFn: () => getSession(sessionId) })

  const questions = useMemo(
    () => (session ? getSessionQuestions(session) : []),
    [session],
  )
  const currentQuestion: PracticeQuestion | undefined = questions[currentIndex]

  const submitMutation = useMutation({
    mutationFn: () => submitSession(sessionId),
    onSuccess: () => {
      // The Summary/Review pages re-fetch this same query key — without
      // invalidating it here, the shared QueryClient's 1-minute staleTime
      // (lib/query-client.ts) would let them reuse this page's
      // pre-submission ('in-progress') snapshot instead of the real,
      // now-submitted session.
      void queryClient.invalidateQueries({ queryKey })
      navigate(ROUTES.practiceSummary(sessionId))
    },
  })

  const bookmarkMutation = useMutation({
    mutationFn: (question: PracticeQuestion) =>
      toggleBookmark({
        subtopicId: question.id,
        contentType: 'question',
        title: question.questionText.slice(0, 80),
        subjectName: question.subjectName,
        topicName: question.topicName,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['learn'] }),
  })

  async function updateAnswer(
    questionId: string,
    patch: Partial<
      Pick<PracticeAnswer, 'selectedOptionId' | 'markedForReview' | 'hintUsed'>
    >,
  ) {
    queryClient.setQueryData<PracticeSession>(queryKey, (previous) => {
      if (!previous) return previous
      const existing: PracticeAnswer = previous.answers[questionId] ?? {
        questionId,
        selectedOptionId: null,
        markedForReview: false,
        hintUsed: false,
      }
      return {
        ...previous,
        answers: { ...previous.answers, [questionId]: { ...existing, ...patch } },
      }
    })

    const responseTimeSeconds = Math.max(
      0,
      Math.round((Date.now() - questionShownAtRef.current) / 1000),
    )
    // Real sessions return the immediate correctness reveal here (Step 46
    // §6/§7) — mock sessions already have it embedded on the question
    // itself, so this resolves to `undefined` there and the cache write
    // below is skipped.
    const feedback = await saveAnswer(sessionId, questionId, patch, responseTimeSeconds)
    if (!feedback) return

    queryClient.setQueryData<PracticeSession>(queryKey, (previous) => {
      if (!previous) return previous
      const existing = previous.answers[questionId]
      if (!existing) return previous
      return {
        ...previous,
        answers: {
          ...previous.answers,
          [questionId]: {
            ...existing,
            isCorrect: feedback.isCorrect,
            correctOptionId: feedback.correctOptionId,
            explanation: feedback.standardExplanation,
          },
        },
      }
    })
  }

  function goTo(index: number) {
    setCurrentIndex(Math.min(Math.max(index, 0), questions.length - 1))
  }

  function handleExpire() {
    toast.message(t('practice:practiceSessionPage.timesUpToast'))
    submitMutation.mutate()
  }

  if (isError) {
    return (
      <ErrorState
        title={t('practice:practiceSessionPage.errorTitle')}
        onRetry={() => void refetch()}
      />
    )
  }

  if (session === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  if (session === null) {
    return (
      <ErrorState
        title={t('practice:practiceSessionPage.notFoundTitle')}
        onRetry={() => navigate(ROUTES.dashboard)}
        retryLabel={t('practice:shared.backToDashboard')}
      />
    )
  }

  if (session.status === 'submitted') {
    return <Navigate to={ROUTES.practiceSummary(sessionId)} replace />
  }

  if (!currentQuestion) return null

  const answer: PracticeAnswer = session.answers[currentQuestion.id] ?? {
    questionId: currentQuestion.id,
    selectedOptionId: null,
    markedForReview: false,
    hintUsed: false,
  }
  const isAdaptive = isAdaptiveMode(session.mode)
  const answeredCount = Object.values(session.answers).filter(
    (a) => a.selectedOptionId !== null,
  ).length

  function getPaletteState(index: number): PaletteItemState {
    const question = questions[index]
    const questionAnswer = session?.answers[question.id]
    if (questionAnswer?.markedForReview) return 'marked'
    if (questionAnswer?.selectedOptionId) return 'answered'
    return 'unanswered'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Text variant="caption">
            {t(MODE_META[session.mode].titleKey)}
            {session.subjectName ? ` · ${session.subjectName}` : ''}
          </Text>
          <Text variant="body-sm" className="font-medium">
            {t('practice:shared.questionOf', {
              current: currentIndex + 1,
              total: questions.length,
            })}
          </Text>
        </div>
        <QuestionTimer
          timerType={session.timerType}
          durationSeconds={session.durationSeconds}
          startedAt={session.startedAt}
          isActive={session.status === 'in-progress' && !submitMutation.isPending}
          onExpire={handleExpire}
        />
      </div>

      <Progress
        value={((currentIndex + 1) / questions.length) * 100}
        aria-label={t('practice:practiceSessionPage.sessionProgressAriaLabel')}
        className="h-1.5"
      />

      <PracticeQuestionPanel
        key={currentQuestion.id}
        question={currentQuestion}
        answer={answer}
        isAdaptive={isAdaptive}
        sessionId={sessionId}
        onSelectOption={(optionId) =>
          void updateAnswer(currentQuestion.id, { selectedOptionId: optionId })
        }
        onToggleMarkForReview={() =>
          void updateAnswer(currentQuestion.id, {
            markedForReview: !answer.markedForReview,
          })
        }
        onHintUsed={() => void updateAnswer(currentQuestion.id, { hintUsed: true })}
        isBookmarked={isContentBookmarked(currentQuestion.id, 'question')}
        bookmarkPending={bookmarkMutation.isPending}
        onToggleBookmark={() => bookmarkMutation.mutate(currentQuestion)}
        isPremiumEntitled={isPremiumEntitled}
      />

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <ChevronLeft />
          {t('common:pagination.previous')}
        </Button>
        {currentIndex === questions.length - 1 ? (
          <Button
            loading={submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {t('practice:practiceSessionPage.submitTest')}
          </Button>
        ) : (
          <Button onClick={() => goTo(currentIndex + 1)}>
            {t('common:pagination.next')}
            <ChevronRight />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="flex items-center justify-between gap-2">
          <Text variant="caption">
            {t('practice:practiceSessionPage.answeredOfTotal', {
              answered: answeredCount,
              total: questions.length,
            })}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            loading={submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {t('practice:practiceSessionPage.submitTest')}
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
