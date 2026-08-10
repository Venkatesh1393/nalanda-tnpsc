/** Kept identical to the already-built `frontend/src/constants/currentAffairs.ts`. */
export const CURRENT_AFFAIRS_CATEGORIES = [
  'national',
  'tamil-nadu',
  'economy',
  'environment',
  'science-tech',
  'polity-governance',
  'international',
  'sports-awards',
] as const
export type CurrentAffairsCategory = (typeof CURRENT_AFFAIRS_CATEGORIES)[number]

export const CURRENT_AFFAIRS_PERIODS = ['daily', 'weekly', 'monthly'] as const
export type CurrentAffairsPeriod = (typeof CURRENT_AFFAIRS_PERIODS)[number]
