import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { motionFast } from '@/animations/variants'
import { QuestionCard } from '@/components/question-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import {
  AiExplanationPanel,
  QuestionPalette,
  type PaletteItemState,
} from '@/features/practice'
import { isContentBookmarked, toggleBookmark } from '@/services/learnProgressService'
import { getMySubscription } from '@/services/paymentsService'
import { getReview, getSessionQuestions, isRealId } from '@/services/practiceSessionService'
import { cn } from '@/lib/utils'
import type { PracticeAnswer, PracticeQuestion } from '@/types/practice'

type Outcome = 'correct' | 'incorrect' | 'skipped'

/**
 * Review (docs/Smart_Practice.md §8) — a deliberate, question-by-question
 * walkthrough distinct from the aggregate Practice Summary: the same
 * question palette pattern, now color-coded by outcome rather than
 * answered/marked/unanswered, plus AI Explanation for every question and a
 * prominent "Bookmark for Revision" on every incorrect one — per §8/§9, the
 * primary, most natural moment a user decides what's worth saving.
 */
export function PracticeReviewPage() {
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
  const [direction, setDirection] = useState(1)
  const { t } = useTranslation(['common', 'practice'])

  const {
    data: session,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['practice', 'review', sessionId],
    queryFn: () => getReview(sessionId),
  })

  const questions = useMemo(
    () => (session ? getSessionQuestions(session) : []),
    [session],
  )
  const currentQuestion: PracticeQuestion | undefined = questions[currentIndex]

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

  function goTo(index: number) {
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(Math.min(Math.max(index, 0), questions.length - 1))
  }

  function outcomeFor(
    question: PracticeQuestion,
    answer: PracticeAnswer | undefined,
    selectedOptionId: string | null,
  ): Outcome {
    if (selectedOptionId === null) return 'skipped'
    const correctOptionId = answer?.correctOptionId ?? question.correctOptionId
    return selectedOptionId === correctOptionId ? 'correct' : 'incorrect'
  }

  if (isError) {
    return (
      <ErrorState
        title={t('practice:practiceReviewPage.errorTitle')}
        onRetry={() => void refetch()}
      />
    )
  }

  if (session === undefined) {
    return <Skeleton className="h-96 w-full rounded-xl" />
  }

  if (session === null || session.status !== 'submitted' || !currentQuestion) {
    return (
      <EmptyState
        title={t('practice:practiceReviewPage.emptyTitle')}
        description={t('practice:practiceReviewPage.emptyDescription')}
        actionLabel={t('practice:shared.backToDashboard')}
        onAction={() => navigate(ROUTES.dashboard)}
      />
    )
  }

  const currentAnswer = session.answers[currentQuestion.id]
  const selectedOptionId = currentAnswer?.selectedOptionId ?? null
  const outcome = outcomeFor(currentQuestion, currentAnswer, selectedOptionId)
  const correctOptionId =
    currentAnswer?.correctOptionId ?? currentQuestion.correctOptionId
  const explanation = currentAnswer?.explanation ?? currentQuestion.explanation ?? ''
  const outcomeBadgeVariant =
    outcome === 'correct'
      ? 'success'
      : outcome === 'incorrect'
        ? 'destructive'
        : 'outline'
  const outcomeLabel = t(`practice:shared.outcome.${outcome}`)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Heading variant="heading-2">{t('practice:practiceReviewPage.heading')}</Heading>
          <Text variant="body-sm">
            {t('practice:shared.questionOf', {
              current: currentIndex + 1,
              total: questions.length,
            })}
          </Text>
        </div>
        <Badge variant={outcomeBadgeVariant}>{outcomeLabel}</Badge>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: direction * 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * 32 }}
          transition={motionFast}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {currentQuestion.source === 'pyq' && currentQuestion.pyqYear && (
                <Badge variant="outline">
                  {t('practice:shared.tnpscYear', { year: currentQuestion.pyqYear })}
                </Badge>
              )}
              <Badge variant="outline">
                {currentQuestion.subjectName} · {currentQuestion.topicName}
              </Badge>
            </div>
            {outcome === 'incorrect' && (
              <Button
                variant="outline"
                size="sm"
                loading={bookmarkMutation.isPending}
                onClick={() => bookmarkMutation.mutate(currentQuestion)}
              >
                <Bookmark
                  className={cn(
                    isContentBookmarked(currentQuestion.id, 'question') && 'fill-current',
                  )}
                />
                {t('practice:practiceReviewPage.bookmarkForRevision')}
              </Button>
            )}
          </div>

          <QuestionCard
            questionText={currentQuestion.questionText}
            options={currentQuestion.options}
            difficulty={currentQuestion.difficulty}
            selectedOptionId={selectedOptionId ?? undefined}
            correctOptionId={correctOptionId}
            disabled
          />

          {correctOptionId && (
            <AiExplanationPanel
              standardExplanation={explanation}
              selectedOptionId={selectedOptionId}
              correctOptionId={correctOptionId}
              options={currentQuestion.options}
              isPremiumEntitled={isPremiumEntitled}
              sessionId={sessionId}
              questionId={currentQuestion.id}
              canRequestAi={isRealId(sessionId) && isRealId(currentQuestion.id)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <ChevronLeft />
          {t('common:pagination.previous')}
        </Button>
        <Button
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex === questions.length - 1}
        >
          {t('common:pagination.next')}
          <ChevronRight />
        </Button>
      </div>

      <QuestionPalette
        count={questions.length}
        currentIndex={currentIndex}
        getState={(index): PaletteItemState => {
          const question = questions[index]
          const questionAnswer = session.answers[question.id]
          const selected = questionAnswer?.selectedOptionId ?? null
          return outcomeFor(question, questionAnswer, selected)
        }}
        onJump={goTo}
      />

      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={() => navigate(ROUTES.practiceSummary(sessionId))}
        >
          {t('practice:practiceReviewPage.backToSummary')}
        </Button>
      </div>
    </div>
  )
}
