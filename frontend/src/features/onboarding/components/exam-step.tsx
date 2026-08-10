import { useTranslation } from 'react-i18next'

import { OptionCard } from '@/components/inputs/option-card'
import { Heading, Text } from '@/components/typography'
import { EXAM_CATEGORIES, type ExamCategoryId } from '@/constants/exam'
import type { OnboardingLanguage } from '@/constants/onboarding'

type ExamStepProps = {
  value: ExamCategoryId[]
  onChange: (value: ExamCategoryId[]) => void
  language: OnboardingLanguage | null
}

function labelFor(
  option: (typeof EXAM_CATEGORIES)[number],
  language: OnboardingLanguage | null,
): string {
  if (language === 'ta') return option.label.ta
  if (language === 'bilingual') return `${option.label.en} · ${option.label.ta}`
  return option.label.en
}

/**
 * Step 2 — Choose Exam (docs/Onboarding.md Screen 2) — multi-select grid of
 * the 8 TNPSC exam categories; at least one is required to continue. Labels
 * respect the language chosen in Step 1 (docs/UI_Design_System.md's
 * bilingual-dignity principle — this step is the first real proof that the
 * choice mattered, not just a cosmetic toggle).
 */
export function ExamStep({ value, onChange, language }: ExamStepProps) {
  const { t } = useTranslation('onboarding')
  function toggle(examId: ExamCategoryId) {
    onChange(
      value.includes(examId) ? value.filter((id) => id !== examId) : [...value, examId],
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <Heading variant="heading-2">{t('exam.heading')}</Heading>
        <Text variant="body-sm">{t('exam.subtitle')}</Text>
      </div>

      <div
        role="group"
        aria-label={t('exam.ariaLabel')}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {EXAM_CATEGORIES.map((option) => (
          <OptionCard
            key={option.id}
            role="checkbox"
            selected={value.includes(option.id)}
            title={labelFor(option, language)}
            onSelect={() => toggle(option.id)}
          />
        ))}
      </div>

      {value.length > 3 && (
        <Text variant="body-sm" className="text-center">
          {t('exam.manyExamsNote')}
        </Text>
      )}
    </div>
  )
}
