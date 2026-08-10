import type { SubscriptionTier } from '../constants/roles'
import type { FeatureKey } from '../constants/entitlements'

/**
 * The single source of truth for "what does each plan cost and unlock"
 * (Sprint 4 Step 55's "configurable plan architecture, do NOT hardcode
 * premium behavior throughout components" instruction). Every price/feature
 * decision in the product should trace back to this file — nothing else
 * should hardcode a tier's price or feature list.
 *
 * Prices (INR) match the values already live in
 * `frontend/src/services/mock/paymentsMockService.ts` (Plus ₹49/mo · ₹470/yr,
 * Pro ₹199/mo · ₹1990/yr) — this migrates that mock data to the real backend
 * rather than inventing new numbers, per this step's "do not decide final
 * INR pricing unless already defined in project documentation" instruction.
 *
 * Feature-to-tier assignment: `ai_explanations`/`premium_practice`/
 * `premium_study_material`/`additional_mock_exams` unlock at Plus (matches
 * the AI Explanation entitlement already shipped in
 * `practice.service.ts#getReview`, which has granted it to any non-free tier
 * since Step 46). `ai_tutor`/`advanced_analytics` are reserved for Pro and
 * above, matching the Pro-tier feature copy already in the mock service
 * ("AI Mains answer evaluation", "Deep Analytics + Rank Prediction").
 * Institutional carries every feature (per-seat custom pricing, `docs/
 * Database.md` §4.6's note that Institutions become first-class once built).
 */
export interface PlanDefinition {
  tier: SubscriptionTier
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  /** Institutional's price is negotiated per seat/branch, never a fixed
   * number a student would see on a pricing page. */
  isCustomPricing: boolean
  features: FeatureKey[]
  /** Marketing bullet points — display-only, never used for entitlement
   * checks (that's `features` above, checked via `services/entitlement.
   * service.ts`, never a string match against this list). */
  highlights: string[]
}

const PLUS_FEATURES: FeatureKey[] = [
  'ai_explanations',
  'premium_practice',
  'premium_study_material',
  'additional_mock_exams',
]

const PRO_FEATURES: FeatureKey[] = [...PLUS_FEATURES, 'ai_tutor', 'advanced_analytics']

export const PLAN_CATALOG: readonly PlanDefinition[] = [
  {
    tier: 'free',
    name: 'Free',
    description: 'Everything a student needs to get started, at no cost.',
    monthlyPrice: 0,
    annualPrice: 0,
    isCustomPricing: false,
    features: [],
    highlights: [
      'Full Learn module access',
      'Limited daily practice questions',
      'Daily Current Affairs',
      'Basic Analytics',
      'Memory Tricks (always free)',
    ],
  },
  {
    tier: 'plus',
    name: 'Plus',
    description: 'Unlimited practice and AI-explained answers for serious prep.',
    monthlyPrice: 49,
    annualPrice: 470,
    isCustomPricing: false,
    features: PLUS_FEATURES,
    highlights: [
      'Unlimited practice — all modes',
      'Full PYQ archive',
      'Unlimited hints',
      'AI Explanations on every question',
      'Weekly + Monthly Current Affairs',
      'Everything in Free',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    description: 'Deep analytics and an AI tutor for candidates chasing rank 1.',
    monthlyPrice: 199,
    annualPrice: 1990,
    isCustomPricing: false,
    features: PRO_FEATURES,
    highlights: [
      'AI Tutor',
      'AI Mains answer evaluation',
      'Deep Analytics + Rank Prediction',
      'Mock interview practice',
      'Priority AI doubt resolution',
      'Everything in Plus',
    ],
  },
  {
    tier: 'institutional',
    name: 'Institutional',
    description: 'Per-seat plans for coaching centres and training institutions.',
    monthlyPrice: 0,
    annualPrice: 0,
    isCustomPricing: true,
    features: [...PRO_FEATURES],
    highlights: [
      'Per-seat / per-branch pricing',
      'Cohort analytics for coaching centres',
      'White-label options',
      'Dedicated onboarding support',
      'Everything in Pro',
    ],
  },
] as const
