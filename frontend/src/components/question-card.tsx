import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Text } from '@/components/typography'
import { cn } from '@/lib/utils'

export type QuestionOption = {
  id: string
  text: string
}

type QuestionCardProps = {
  questionText: string
  options: QuestionOption[]
  difficulty?: 'easy' | 'medium' | 'hard'
  selectedOptionId?: string | null
  onSelectOption?: (optionId: string) => void
  /**
   * Only ever pass this once the caller has legitimately revealed the
   * answer (Review mode, or after `GET /questions/{id}/explanation` per
   * docs/API.md §5) — this component has no opinion on *when* that's
   * allowed, it only renders correctness styling if given a value.
   */
  correctOptionId?: string
  /** Read-only display (Review mode) — rows render but no longer respond to clicks. */
  disabled?: boolean
  className?: string
}

/**
 * The core Practice question surface (docs/Smart_Practice.md §3,
 * docs/UI_Design_System.md §38): generous question text, full-width
 * selectable option rows (never small radio buttons), a discreet difficulty
 * badge, and — once `correctOptionId` is supplied — correct/incorrect
 * outcome styling for Review mode.
 */
export function QuestionCard({
  questionText,
  options,
  difficulty,
  selectedOptionId,
  onSelectOption,
  correctOptionId,
  disabled = false,
  className,
}: QuestionCardProps) {
  const { t } = useTranslation('common')
  const revealed = correctOptionId !== undefined

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <Text variant="body-lg" className="font-medium">
          {questionText}
        </Text>
        {difficulty && (
          <Badge variant="outline" className="shrink-0 capitalize">
            {t(`difficulty.${difficulty}`)}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div
          className="flex flex-col gap-2"
          role="radiogroup"
          aria-label={t('a11y.answerOptions')}
        >
          {options.map((option) => {
            const isSelected = option.id === selectedOptionId
            const isCorrectOption = revealed && option.id === correctOptionId
            const isWrongSelected =
              revealed && isSelected && option.id !== correctOptionId

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => onSelectOption?.(option.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors',
                  'border-border hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent',
                  isSelected && !revealed && 'border-primary bg-primary/10',
                  isCorrectOption && 'border-success bg-success/10',
                  isWrongSelected && 'border-destructive bg-destructive/10',
                )}
              >
                <span>{option.text}</span>
                {isCorrectOption && (
                  <Check className="text-success size-4 shrink-0" aria-hidden="true" />
                )}
                {isWrongSelected && (
                  <X className="text-destructive size-4 shrink-0" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
