import { useTranslation } from 'react-i18next'

import { ToggleChip } from '@/components/inputs/toggle-chip'
import { NOTIFICATION_CATEGORIES } from '@/constants/notifications'
import type { NotificationCategoryId } from '@/types/notifications'

export type NotificationCategoryFilterValue = 'all' | NotificationCategoryId

type CategoryFilterProps = {
  value: NotificationCategoryFilterValue
  onChange: (value: NotificationCategoryFilterValue) => void
}

/** Single-select category chips above the notification list — "All" plus
 * the 4 Notification categories (`constants/notifications.ts`), the same
 * `ToggleChip` single-select pattern `features/current-affairs/components/
 * category-filter.tsx` already established. */
export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const { t } = useTranslation('notifications')

  return (
    <div className="flex flex-wrap gap-2">
      <ToggleChip
        role="radio"
        label={t('categoryFilter.all')}
        selected={value === 'all'}
        onSelect={() => onChange('all')}
      />
      {NOTIFICATION_CATEGORIES.map((category) => (
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
