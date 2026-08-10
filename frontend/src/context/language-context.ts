import { createContext } from 'react'

/**
 * The Navbar's quick EN/தமிழ் toggle (docs/Landing_Page_Design.md §1,
 * docs/Navigation.md). Distinct from the fuller `ta | en | bilingual`
 * `languagePreference` captured during Onboarding (docs/Database.md §4.1) —
 * this is the lighter, always-available surface-language switch; bilingual
 * mixed-view remains a Settings-level choice, not this toggle's concern.
 */
export type Language = 'en' | 'ta'

export type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
}

/**
 * The raw context object only — no logic, no Provider (that's
 * `providers/language-provider.tsx`), mirroring the exact
 * context/providers/hooks split already established for theme
 * (`context/theme-context.ts`).
 */
export const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => null,
})
