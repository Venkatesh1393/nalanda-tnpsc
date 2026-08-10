import { createContext } from 'react'

export type Theme = 'dark' | 'light' | 'system'

export type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

/**
 * The raw context object only — no logic, no Provider. Kept separate from
 * `providers/theme-provider.tsx` (which implements the actual dark/light/
 * system behavior) so a consumer only needs the tiny, stable context shape,
 * not the provider's implementation details.
 */
export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => null,
})
