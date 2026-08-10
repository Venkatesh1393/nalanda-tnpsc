/**
 * Onboarding wizard reference data (docs/Onboarding.md) — kept identical to
 * `frontend/src/constants/onboarding.ts`'s ids so a value round-trips
 * through the API without a translation layer.
 */
export const LEARNING_STYLES = ['video', 'notes', 'practice', 'mixed'] as const
export type LearningStyle = (typeof LEARNING_STYLES)[number]

/** Sentinel for docs/Onboarding.md Screen 3's "I'm not sure yet" option —
 * `targetMonth` is either this or a `YYYY-MM` string, never absent once set. */
export const NOT_SURE_TARGET_MONTH = 'not-sure'

export const TARGET_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
