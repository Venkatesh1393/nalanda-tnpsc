/**
 * Sprint 4 Step 55 — Premium Plans + Entitlement Engine. The complete set of
 * gate-able product features. Adding a feature here (and to a plan's
 * `features` list in `config/plans.config.ts`) is the only step needed to
 * gate something new — no service should ever re-derive "is this user
 * premium" from `subscriptionTier` directly (see
 * `services/entitlement.service.ts`'s header comment).
 */
export const FEATURE_KEYS = [
  'ai_explanations',
  'ai_tutor',
  'premium_practice',
  'advanced_analytics',
  'premium_study_material',
  'additional_mock_exams',
] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]
