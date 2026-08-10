import { useTranslation } from 'react-i18next'

import { ToggleChip } from '@/components/inputs/toggle-chip'
import { CURRENT_AFFAIRS_CATEGORIES } from '@/constants/currentAffairs'
import type { CurrentAffairsCategoryId } from '@/types/currentAffairs'

export type CategoryFilterValue = 'all' | CurrentAffairsCategoryId

type CategoryFilterProps = {
  value: CategoryFilterValue
  onChange: (value: CategoryFilterValue) => void
}

/** Single-select category chips above the feed — "All" plus the 8 Current
 * Affairs categories (`constants/currentAffairs.ts`), the same `ToggleChip`
 * single-select filter pattern already used by Learn's Topic/Subtopic
 * lists. */
export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const { t } = useTranslation('currentAffairs')

  return (
    <div className="flex flex-wrap gap-2">
      <ToggleChip
        role="radio"
        label={t('categoryFilter.all')}
        selected={value === 'all'}
        onSelect={() => onChange('all')}
      />
      {CURRENT_AFFAIRS_CATEGORIES.map((category) => (
        <ToggleChip
          key={category.id}
          role="radio"
          label={t(`categories.${category.id}`)}
          selected={value === category.id}
          onSelect={() => onChange(category.id)}
        />
      ))}
    </div>
  )
}
