import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ToggleChip } from '@/components/inputs/toggle-chip'
import { Heading, Text } from '@/components/typography'
import { useLanguage } from '@/hooks/use-language'
import { getUpcomingMonths, NOT_SURE_TARGET_MONTH } from '@/constants/onboarding'

type TargetMonthStepProps = {
  value: string | null
  onChange: (value: string) => void
}

/**
 * Step 3 — Choose Target (docs/Onboarding.md Screen 3) — a month/year picker
 * rather than a full calendar date-picker (TNPSC notifications specify
 * exam windows, months ahead, not exact days — asking for a precise date
 * would manufacture false precision). "I'm not sure yet" carries the same
 * visual weight as the month chips, since genuine uncertainty here is the
 * norm, not the exception.
 */
export function TargetMonthStep({ value, onChange }: TargetMonthStepProps) {
  const { t } = useTranslation('onboarding')
  const { language } = useLanguage()
  const months = useMemo(() => getUpcomingMonths(12, new Date(), language), [language])
  const isNotSure = value === NOT_SURE_TARGET_MONTH

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <Heading variant="heading-2">{t('targetMonth.heading')}</Heading>
        <Text variant="body-sm">{t('targetMonth.subtitle')}</Text>
      </div>

      <div
        role="radiogroup"
        aria-label={t('targetMonth.ariaLabel')}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap justify-center gap-2">
          {months.map((month) => (
            <ToggleChip
              key={month.id}
              role="radio"
              selected={value === month.id}
              label={month.label}
              onSelect={() => onChange(month.id)}
            />
          ))}
        </div>
        <ToggleChip
          role="radio"
          selected={isNotSure}
          label={t('targetMonth.notSure')}
          onSelect={() => onChange(NOT_SURE_TARGET_MONTH)}
          className="mx-auto"
        />
      </div>

      {isNotSure && (
        <Text variant="body-sm" className="text-center">
          {t('targetMonth.notSureNote')}
        </Text>
      )}
    </div>
  )
}
