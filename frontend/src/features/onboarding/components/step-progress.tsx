import { useTranslation } from 'react-i18next'

import { Progress } from '@/components/ui/progress'
import { Text } from '@/components/typography'

type StepProgressProps = {
  /** 1-based position within the data-entry steps only (docs/Onboarding_Personalization_Flow.md
   * §2 — "Step 2 of 5"-style indicator). */
  currentStep: number
  totalSteps: number
  label: string
}

/**
 * The slim, segmented progress bar shown at the top of every data-entry
 * step (docs/Onboarding_Personalization_Flow.md §2) — gives a concrete
 * sense of remaining effort for the price-sensitive, low-patience personas
 * (Priya) that penalize an open-ended-feeling signup flow.
 */
export function StepProgress({ currentStep, totalSteps, label }: StepProgressProps) {
  const { t } = useTranslation('onboarding')
  const percent = Math.round((currentStep / totalSteps) * 100)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Text variant="overline">
          {t('stepProgress.stepOf', { current: currentStep, total: totalSteps })}
        </Text>
        <Text variant="caption">{label}</Text>
      </div>
      <Progress
        value={percent}
        aria-label={t('stepProgress.ariaLabel', {
          current: currentStep,
          total: totalSteps,
          label,
        })}
      />
    </div>
  )
}
