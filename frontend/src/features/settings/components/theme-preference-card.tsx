import { Laptop, type LucideIcon, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OptionCard } from '@/components/inputs/option-card'
import type { Theme } from '@/context/theme-context'
import { useTheme } from '@/hooks/use-theme'

const THEME_OPTIONS: {
  value: Theme
  icon: LucideIcon
}[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Laptop },
]

/** The fuller Light/Dark/System control `components/theme-toggle.tsx`'s own
 * header comment already earmarked for "the real Settings screen... when
 * that page is built" — this is that page. Reuses `OptionCard`
 * (Onboarding's "pick a card" primitive) rather than the Navbar's compact
 * binary toggle, since a dedicated Settings tab has room for the real
 * three-way choice (including `system`, which the Navbar toggle can't
 * reach at all). */
export function ThemePreferenceCard() {
  const { t } = useTranslation('settings')
  const { theme, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('themePreferenceCard.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            role="radio"
            icon={option.icon}
            title={t(`themePreferenceCard.options.${option.value}.title`)}
            description={t(`themePreferenceCard.options.${option.value}.description`)}
            selected={theme === option.value}
            onSelect={() => setTheme(option.value)}
          />
        ))}
      </CardContent>
    </Card>
  )
}
