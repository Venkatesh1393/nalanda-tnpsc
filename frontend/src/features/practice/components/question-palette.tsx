import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export type PaletteItemState =
  'answered' | 'marked' | 'unanswered' | 'correct' | 'incorrect' | 'skipped'

type QuestionPaletteProps = {
  count: number
  currentIndex: number
  getState: (index: number) => PaletteItemState
  onJump: (index: number) => void
  className?: string
}

const STATE_CLASSES: Record<PaletteItemState, string> = {
  answered: 'bg-success/15 text-success border-success/40',
  marked: 'bg-warning/15 text-warning border-warning/40',
  unanswered: 'bg-muted text-muted-foreground border-border',
  correct: 'bg-success/15 text-success border-success/40',
  incorrect: 'bg-destructive/15 text-destructive border-destructive/40',
  skipped: 'bg-muted text-muted-foreground border-border',
}

/**
 * The question palette/navigator (docs/UserJourney.md Screen 7) — jump to
 * any question, colored by answered/marked/unanswered during live practice
 * or by correct/incorrect/skipped outcome during Review
 * (docs/Smart_Practice.md §8), depending on what `getState` returns. The
 * current question always renders in the primary fill regardless of its
 * underlying state, so "where am I" is never ambiguous.
 */
export function QuestionPalette({
  count,
  currentIndex,
  getState,
  onJump,
  className,
}: QuestionPaletteProps) {
  const { t } = useTranslation('practice')

  return (
    <div
      role="group"
      aria-label={t('questionPalette.groupAriaLabel')}
      className={cn('grid grid-cols-6 gap-1.5 sm:grid-cols-8', className)}
    >
      {Array.from({ length: count }, (_, index) => {
        const isCurrent = index === currentIndex
        return (
          <button
            key={index}
            type="button"
            onClick={() => onJump(index)}
            aria-current={isCurrent ? 'true' : undefined}
            aria-label={
              isCurrent
                ? t('questionPalette.itemAriaLabelCurrent', { number: index + 1 })
                : t('questionPalette.itemAriaLabel', { number: index + 1 })
            }
            className={cn(
              'flex size-8 items-center justify-center rounded-md border text-xs font-medium tabular-nums transition-colors pointer-coarse:size-11',
              isCurrent
                ? 'border-primary bg-primary text-primary-foreground'
                : STATE_CLASSES[getState(index)],
            )}
          >
            {index + 1}
          </button>
        )
      })}
    </div>
  )
}
