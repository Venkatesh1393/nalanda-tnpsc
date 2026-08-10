/**
 * The 8 TNPSC exam categories the platform supports (docs/PRD.md — Project
 * Goal; docs/Database.md §4.1's examCategories enum). Bilingual labels
 * included per the bilingual-dignity principle in docs/UI_Design_System.md.
 */
export const EXAM_CATEGORIES = [
  { id: 'group-1', label: { en: 'Group 1', ta: 'குரூப் 1' } },
  { id: 'group-2', label: { en: 'Group 2', ta: 'குரூப் 2' } },
  { id: 'group-2a', label: { en: 'Group 2A', ta: 'குரூப் 2ஏ' } },
  { id: 'group-4', label: { en: 'Group 4', ta: 'குரூப் 4' } },
  { id: 'vao', label: { en: 'VAO', ta: 'கிராம நிர்வாக அலுவலர்' } },
  { id: 'police', label: { en: 'Police', ta: 'காவல்துறை' } },
  { id: 'forest', label: { en: 'Forest', ta: 'வனத்துறை' } },
  { id: 'trb', label: { en: 'TRB', ta: 'ஆசிரியர் தேர்வு வாரியம்' } },
] as const

export type ExamCategoryId = (typeof EXAM_CATEGORIES)[number]['id']

/**
 * Subscription tiers (docs/PRD.md §9, docs/Database.md §4.6).
 */
export const SUBSCRIPTION_TIERS = ['free', 'plus', 'pro', 'institutional'] as const
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number]
