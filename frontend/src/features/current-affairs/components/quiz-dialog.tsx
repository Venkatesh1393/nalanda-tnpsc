import { useQuery } from '@tanstack/react-query'
import { PartyPopper, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { QuestionCard } from '@/components/question-card'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Heading, Text } from '@/components/typography'
import { getCurrentAffairsQuiz } from '@/services/currentAffairsService'

type QuizDialogProps = {
  articleId: string
  articleTitle: string
}

/**
 * The per-article Current Affairs Quiz (docs/InformationArchitecture.md
 * §7.9's "Current Affairs Quiz — auto-generated from the last N days'
 * content," scoped here to a single article rather than a multi-day roll-up
 * — a smaller, honestly-scoped equivalent of Smart Practice's full session
 * engine, deliberately self-contained rather than routed through
 * `services/practiceSessionService.ts`'s timer/palette/XP machinery, which
 * would be a mismatched fit for a 2-3 question comprehension check). Reuses
 * `QuestionCard`'s existing immediate-reveal props exactly like Smart
 * Practice's Topic Quiz mode.
 */
export function QuizDialog({ articleId, articleTitle }: QuizDialogProps) {
  const { t } = useTranslation('currentAffairs')
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const { data: questions } = useQuery({
    queryKey: ['current-affairs', 'quiz', articleId],
    queryFn: () => getCurrentAffairsQuiz(articleId),
    enabled: open,
  })

  function reset() {
    setIndex(0)
    setAnswers({})
  }

  const current = questions?.[index]
  const isLastQuestion = questions ? index === questions.length - 1 : false
  const isFinished = questions ? index >= questions.length : false
  const correctCount = questions
    ? questions.filter((q) => answers[q.id] === q.correctOptionId).length
    : 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ai">
          <Sparkles />
          {t('quizDialog.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{articleTitle}</DialogTitle>
        </DialogHeader>

        {!questions ? (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        ) : questions.length === 0 ? (
          <Text variant="body-sm">{t('quizDialog.noQuizAvailable')}</Text>
        ) : isFinished ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="bg-success/10 text-success flex size-12 items-center justify-center rounded-full">
              <PartyPopper className="size-5" aria-hidden="true" />
            </span>
            <Heading variant="heading-3">
              {t('quizDialog.scoreHeading', {
                correct: correctCount,
                total: questions.length,
              })}
            </Heading>
            <Text variant="body-sm">
              {correctCount === questions.length
                ? t('quizDialog.perfectScore')
                : t('quizDialog.goodScore')}
            </Text>
            <Button variant="outline" onClick={reset}>
              {t('quizDialog.retake')}
            </Button>
          </div>
        ) : current ? (
          <div className="flex flex-col gap-3">
            <Text variant="caption">
              {t('quizDialog.questionOf', { current: index + 1, total: questions.length })}
            </Text>
            <QuestionCard
              questionText={current.questionText}
              options={current.options}
              selectedOptionId={answers[current.id] ?? null}
              correctOptionId={answers[current.id] ? current.correctOptionId : undefined}
              disabled={Boolean(answers[current.id])}
              onSelectOption={(optionId) =>
                setAnswers((prev) => ({ ...prev, [current.id]: optionId }))
              }
            />
            {answers[current.id] && (
              <div className="bg-muted flex flex-col gap-1 rounded-lg p-3">
                <Text variant="caption" className="text-foreground font-medium">
                  {t('quizDialog.explanationHeading')}
                </Text>
                <Text variant="body-sm">{current.explanation}</Text>
              </div>
            )}
            <Button
              disabled={!answers[current.id]}
              onClick={() => setIndex((i) => i + 1)}
            >
              {isLastQuestion ? t('quizDialog.seeResults') : t('quizDialog.nextQuestion')}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
