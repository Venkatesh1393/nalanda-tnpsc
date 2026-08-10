import type { CurrentAffairsCategory } from '@/types/currentAffairs'

/**
 * Current Affairs category reference data — same category as `exam.ts`
 * (static lookup data, not fetched). Used by the category filter chips and
 * every article's category badge.
 */
export const CURRENT_AFFAIRS_CATEGORIES: CurrentAffairsCategory[] = [
  { id: 'national', label: 'National' },
  { id: 'tamil-nadu', label: 'Tamil Nadu' },
  { id: 'economy', label: 'Economy' },
  { id: 'environment', label: 'Environment' },
  { id: 'science-tech', label: 'Science & Tech' },
  { id: 'polity-governance', label: 'Polity & Governance' },
  { id: 'international', label: 'International' },
  { id: 'sports-awards', label: 'Sports & Awards' },
]

export function getCategoryLabel(id: CurrentAffairsCategory['id']): string {
  return CURRENT_AFFAIRS_CATEGORIES.find((c) => c.id === id)?.label ?? id
}
