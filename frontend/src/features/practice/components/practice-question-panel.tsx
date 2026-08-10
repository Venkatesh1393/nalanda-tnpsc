import { motion } from 'framer-motion'
import { Flag, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { motionFast } from '@/animations/variants'
import { QuestionCard } from '@/components/question-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/typography'
import { AiExplanationPanel } from '@/features/practice/components/ai-explanation-panel'
import { BookmarkToggleButton } from '@/features/learn'
import { consumeHint, isRealId, PracticeMockError } from '@/services/practiceSessionService'
import type { PracticeAnswer, PracticeQuestion } from '@/types/practice'

type PracticeQuestionPanelProps = {
  question: PracticeQuestion
  answer: PracticeAnswer
  /** Topic Quiz/100 Questions reveal correctness immediately
   * (docs/Smart_Practice.md §3/§11); Sectional/Mock/PYQ never do — review
   * only happens post-submission. */
  isAdaptive: boolean
  sessionId: string
  onSelectOption: (optionId: string) => void
  onToggleMarkForReview: () => void
  onHintUsed: () => void
  isBookmarked: boolean
  bookmarkPending: boolean
  onToggleBookmark: () => void
  /** `false` for free-tier users — gates the AI Explanation section once
   * revealed (Step 46 §8). */
  isPremiumEntitled: boolean
}

/**
 * The live-practice question surface — wraps `components/question-card.tsx`
 * (already built) with the Practice-specific chrome around it: difficulty
 * badge is QuestionCard's own; this adds the PYQ year tag
 * (docs/Smart_Practice.md §7), hint (§4), bookmark (§9), mark-for-review,
 * and — for adaptive modes only — the immediate reveal + AI Explanation
 * placeholder once the current question has an answer.
 */
export function PracticeQuestionPanel({
  question,
  answer,
  isAdaptive,
  sessionId,
  onSelectOption,
  onToggleMarkForReview,
  onHintUsed,
  isBookmarked,
  bookmarkPending,
  onToggleBookmark,
  isPremiumEntitled,
}: PracticeQuestionPanelProps) {
  const { t } = useTranslation('practice')
  const [hintPending, setHintPending] = useState(false)
  const selectedOptionId = answer.selectedOptionId
  const hasAnswered = selectedOptionId !== null
  const revealed = isAdaptive && hasAnswered
  const correctOptionId = answer.correctOptionId ?? question.correctOptionId
  const explanation = answer.explanation ?? question.explanation ?? ''

  async function handleGetHint() {
    setHintPending(true)
    try {
      const { hintsRemainingToday } = await consumeHint(sessionId, question.id)
      onHintUsed()
      if (hintsRemainingToday === 0) {
        toast.info(t('practiceQuestionPanel.lastFreeHintToast'))
      }
    } catch (error) {
      if (error instanceof PracticeMockError) {
        toast.error(
          error.code === 'DAILY_HINT_LIMIT_REACHED'
            ? t('practiceQuestionPanel.dailyHintLimitTitle')
            : t('practiceQuestionPanel.genericErrorTitle'),
          { description: error.message },
        )
      }
    } finally {
      setHintPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {question.source === 'pyq' && question.pyqYear && (
            <Badge variant="outline">
              {t('shared.tnpscYear', { year: question.pyqYear })}
            </Badge>
          )}
          <Badge variant="outline">
            {question.subjectName} · {question.topicName}
          </Badge>
        </div>
        <BookmarkToggleButton
          label={question.questionText.slice(0, 48)}
          isBookmarked={isBookmarked}
          pending={bookmarkPending}
          onToggle={onToggleBookmark}
        />
      </div>

      <QuestionCard
        questionText={question.questionText}
        options={question.options}
        difficulty={question.difficulty}
        selectedOptionId={selectedOptionId ?? undefined}
        onSelectOption={revealed ? undefined : onSelectOption}
        correctOptionId={revealed ? correctOptionId : undefined}
        disabled={revealed}
      />

      <div className="flex flex-wrap items-center gap-2">
        {!hasAnswered && !answer.hintUsed && question.hint !== undefined && (
          <Button
            variant="ghost"
            size="sm"
            loading={hintPending}
            onClick={() => void handleGetHint()}
          >
            <Lightbulb />
            {t('practiceQuestionPanel.getHint')}
          </Button>
        )}
        <Button
          variant={answer.markedForReview ? 'secondary' : 'outline'}
          size="sm"
          onClick={onToggleMarkForReview}
        >
          <Flag />
          {answer.markedForReview
            ? t('practiceQuestionPanel.markedForReview')
            : t('practiceQuestionPanel.markForReview')}
        </Button>
      </div>

      {answer.hintUsed && !revealed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={motionFast}
          className="bg-muted rounded-lg px-4 py-3"
        >
          <Text variant="body-sm">
            <span className="font-medium">{t('practiceQuestionPanel.hintLabelPrefix')} </span>
            {question.hint}
          </Text>
        </motion.div>
      )}

      {revealed && correctOptionId && (
        <AiExplanationPanel
          standardExplanation={explanation}
          selectedOptionId={selectedOptionId}
          correctOptionId={correctOptionId}
          options={question.options}
          isPremiumEntitled={isPremiumEntitled}
          sessionId={sessionId}
          questionId={question.id}
          canRequestAi={isRealId(sessionId) && isRealId(question.id)}
        />
      )}
    </div>
  )
}
