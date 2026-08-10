import { useTranslation } from 'react-i18next'

import { OptionCard } from '@/components/inputs/option-card'
import { Heading, Text } from '@/components/typography'
import { ONBOARDING_LANGUAGES, type OnboardingLanguage } from '@/constants/onboarding'

type LanguageStepProps = {
  value: OnboardingLanguage | null
  onSelect: (language: OnboardingLanguage) => void
}

/**
 * Step 1 — Choose Language (docs/Onboarding.md Screen 1) — auto-advances on
 * tap (`OnboardingPage` handles the advance), since a single unambiguous
 * choice needs no separate Continue press. Tamil and English are
 * equally-weighted primary options; Bilingual is a deliberate, lower-
 * emphasis third choice below them (docs/UI_Design_System.md's bilingual-
 * dignity principle — never force-ranked equally when most users arrive
 * with a clear preference).
 */
export function LanguageStep({ value, onSelect }: LanguageStepProps) {
  const { t } = useTranslation('onboarding')
  const [tamil, english, bilingual] = ONBOARDING_LANGUAGES

  return (
    <div className="flex flex-col gap-6 text-center">
      <div>
        <Heading variant="heading-2">{t('language.heading')}</Heading>
        <Text variant="body-sm">{t('language.subtitle')}</Text>
      </div>

      <div
        role="radiogroup"
        aria-label={t('language.ariaLabel')}
        className="flex flex-col gap-3"
      >
        <div className="grid grid-cols-2 gap-3">
          {[tamil, english].map((option) => (
            <OptionCard
              key={option.id}
              role="radio"
              selected={value === option.id}
              title={t(`language.options.${option.id}`)}
              onSelect={() => onSelect(option.id)}
              className="text-left"
            />
          ))}
        </div>
        <OptionCard
          role="radio"
          selected={value === bilingual.id}
          title={t(`language.options.${bilingual.id}`)}
          onSelect={() => onSelect(bilingual.id)}
          className="mx-auto w-full max-w-[80%] text-left"
        />
      </div>
    </div>
  )
}
