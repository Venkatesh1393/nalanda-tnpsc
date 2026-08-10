import { useTranslation } from 'react-i18next'

import { OptionCard } from '@/components/inputs/option-card'
import { Heading, Text } from '@/components/typography'
import { LEARNING_STYLES, type LearningStyle } from '@/constants/onboarding'

type LearningStyleStepProps = {
  value: LearningStyle | null
  onSelect: (value: LearningStyle) => void
}

/**
 * Step 6 — Preferred Learning Style — not part of docs/Onboarding.md's
 * canonical five steps (see docs/PROJECT_CONTEXT.md §14 for this session's
 * addition); modeled on the persona research in docs/UserPersonas.md.
 * Auto-advances on selection (`OnboardingPage` handles the advance),
 * matching the same single-clean-choice pattern as Study Hours.
 */
export function LearningStyleStep({ value, onSelect }: LearningStyleStepProps) {
  const { t } = useTranslation('onboarding')
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <Heading variant="heading-2">{t('learningStyle.heading')}</Heading>
        <Text variant="body-sm">{t('learningStyle.subtitle')}</Text>
      </div>

      <div
        role="radiogroup"
        aria-label={t('learningStyle.ariaLabel')}
        className="grid grid-cols-2 gap-3"
      >
        {LEARNING_STYLES.map((option) => (
          <OptionCard
            key={option.id}
            role="radio"
            selected={value === option.id}
            title={t(`learningStyle.styles.${option.id}.title`)}
            description={t(`learningStyle.styles.${option.id}.description`)}
            onSelect={() => onSelect(option.id)}
          />
        ))}
      </div>
    </div>
  )
}
