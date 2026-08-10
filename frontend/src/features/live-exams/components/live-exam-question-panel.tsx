import { Flag } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { QuestionCard } from '@/components/question-card'
import { Button } from '@/components/ui/button'
import type { LiveExamAnswer, LiveExamQuestion } from '@/types/liveExam'

type LiveExamQuestionPanelProps = {
  question: LiveExamQuestion
  answer: LiveExamAnswer
  onSelectOption: (optionId: string) => void
  onToggleMarkForReview: () => void
}

/**
 * The live-exam question surface — deliberately simpler than Practice's
 * `PracticeQuestionPanel`: no hint, no immediate reveal, no AI Explanation.
 * `QuestionCard` never receives a `correctOptionId` here, so it can never
 * render outcome styling mid-exam (Step 48's "never send correct answers
 * during live exam" rule, enforced structurally, not just by the backend).
 */
export function LiveExamQuestionPanel({
  question,
  answer,
  onSelectOption,
  onToggleMarkForReview,
}: LiveExamQuestionPanelProps) {
  const { t } = useTranslation('liveExams')
  return (
    <div className="flex flex-col gap-4">
      <QuestionCard
        questionText={question.questionText}
        options={question.options}
        difficulty={question.difficulty}
        selectedOptionId={answer.selectedOptionId ?? undefined}
        onSelectOption={onSelectOption}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={answer.markedForReview ? 'secondary' : 'outline'}
          size="sm"
          onClick={onToggleMarkForReview}
        >
          <Flag />
          {answer.markedForReview
            ? t('questionPanel.markedForReview')
            : t('questionPanel.markForReview')}
        </Button>
      </div>
    </div>
  )
}
