import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'

/**
 * Minimal foundation-verification component — proves Tailwind design tokens,
 * shadcn/ui's Button, Lucide icons, and the ThemeProvider all work together
 * end-to-end. Not a designed product surface; docs/UI_Design_System.md §11-12
 * governs the real Settings-screen theme control when that page is built.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation('common')

  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={nextTheme === 'dark' ? t('theme.switchToDark') : t('theme.switchToLight')}
      onClick={() => setTheme(nextTheme)}
    >
      <Sun className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
