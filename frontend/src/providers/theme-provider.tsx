import { useEffect, useState, type ReactNode } from 'react'

import { ThemeContext, type Theme } from '@/context/theme-context'

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

/**
 * Dark/light/system theme provider (docs/UI_Design_System.md §11-§12).
 * Applies a `dark` or `light` class to <html>, which drives every
 * `.dark { ... }` override in src/index.css. Persists the user's explicit
 * choice; "system" tracks the OS preference live.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'nalanda-ui-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme,
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    const resolveSystemTheme = () =>
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

    if (theme === 'system') {
      root.classList.add(resolveSystemTheme())

      // Keep "system" theme live if the OS preference changes mid-session.
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        root.classList.remove('light', 'dark')
        root.classList.add(resolveSystemTheme())
      }
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }

    root.classList.add(theme)
  }, [theme])

  const setTheme = (nextTheme: Theme) => {
    localStorage.setItem(storageKey, nextTheme)
    setThemeState(nextTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  )
}
