import { useTranslation } from 'react-i18next'

import { OptionCard } from '@/components/inputs/option-card'
import { Heading, Text } from '@/components/typography'
import { STUDY_HOURS_BANDS, type StudyHoursBand } from '@/constants/onboarding'

type StudyHoursStepProps = {
  value: StudyHoursBand | null
  onSelect: (value: StudyHoursBand) => void
}

/**
 * Step 4 — Choose Study Hours (docs/Onboarding.md Screen 4) — four preset
 * bands rather than a slider or numeric entry, since most aspirants think
 * in rough bands, not exact numbers, and presets are faster/more accurate
 * to tap on a small screen. Auto-advances on selection (`OnboardingPage`
 * handles the advance) — a single clean choice with nothing left to confirm.
 */
export function StudyHoursStep({ value, onSelect }: StudyHoursStepProps) {
  const { t } = useTranslation('onboarding')
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <Heading variant="heading-2">{t('studyHours.heading')}</Heading>
        <Text variant="body-sm">{t('studyHours.subtitle')}</Text>
      </div>

      <div
        role="radiogroup"
        aria-label={t('studyHours.ariaLabel')}
        className="grid grid-cols-2 gap-3"
      >
        {STUDY_HOURS_BANDS.map((option) => (
          <OptionCard
            key={option.id}
            role="radio"
            selected={value === option.id}
            title={t(`studyHours.bands.${option.id}`)}
            onSelect={() => onSelect(option.id)}
          />
        ))}
      </div>
    </div>
  )
}
