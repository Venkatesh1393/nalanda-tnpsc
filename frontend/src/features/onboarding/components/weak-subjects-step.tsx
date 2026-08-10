import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ToggleChip } from '@/components/inputs/toggle-chip'
import { Heading, Text } from '@/components/typography'
import type { ExamCategoryId } from '@/constants/exam'
import { getSubjectsForExams } from '@/constants/onboarding'

type WeakSubjectsStepProps = {
  examCategories: ExamCategoryId[]
  value: string[]
  onChange: (value: string[]) => void
}

/**
 * Step 5 — Choose Weak Subjects (docs/Onboarding.md Screen 5) — a
 * multi-select, self-reported signal for the AI Study Plan Generator,
 * scoped to whichever exam(s) were picked in Step 2. Zero selections is a
 * fully valid outcome (`OnboardingPage` never blocks Continue here) — a
 * user genuinely unsure of their weak areas shouldn't be forced to guess.
 * `subject` values themselves (from `getSubjectsForExams`) stay the
 * canonical English strings persisted to the backend — only the on-screen
 * label is translated, via `t('weakSubjects.subjects.<value>')`.
 */
export function WeakSubjectsStep({
  examCategories,
  value,
  onChange,
}: WeakSubjectsStepProps) {
  const { t } = useTranslation('onboarding')
  const subjects = useMemo(() => getSubjectsForExams(examCategories), [examCategories])

  function toggle(subject: string) {
    onChange(
      value.includes(subject)
        ? value.filter((item) => item !== subject)
        : [...value, subject],
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <Heading variant="heading-2">{t('weakSubjects.heading')}</Heading>
        <Text variant="body-sm">{t('weakSubjects.subtitle')}</Text>
      </div>

      <div
        role="group"
        aria-label={t('weakSubjects.ariaLabel')}
        className="flex flex-wrap justify-center gap-2"
      >
        {subjects.map((subject) => (
          <ToggleChip
            key={subject}
            role="checkbox"
            selected={value.includes(subject)}
            // Dynamic key (`subject` is a runtime string, not a literal
            // union) — i18next's typed-resources augmentation can't verify
            // this at compile time, the standard i18next+TS escape hatch.
            label={t(`weakSubjects.subjects.${subject}` as never)}
            onSelect={() => toggle(subject)}
          />
        ))}
      </div>
    </div>
  )
}
