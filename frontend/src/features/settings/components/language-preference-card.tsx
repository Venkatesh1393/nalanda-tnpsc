import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OptionCard } from '@/components/inputs/option-card'
import { Text } from '@/components/typography'
import type { Language } from '@/context/language-context'
import { useLanguage } from '@/hooks/use-language'

const LANGUAGE_OPTION_VALUES: Language[] = ['en', 'ta']

/** The dedicated Settings-level language control — reuses the same
 * `useLanguage`/`LanguageProvider` the Navbar's quick EN/தமிழ் toggle
 * already persists to (`context/language-context.ts`), so switching here
 * or from the Navbar always agrees. Each option's title/description names
 * itself in its own script (settings.languagePreferenceCard.options.*) —
 * deliberately identical in both locale files, the same self-referential
 * pattern `onboarding.language.options` uses, since a language's own name
 * isn't something the active UI language should translate. */
export function LanguagePreferenceCard() {
  const { t } = useTranslation('settings')
  const { language, setLanguage } = useLanguage()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('languagePreferenceCard.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {LANGUAGE_OPTION_VALUES.map((value) => (
            <OptionCard
              key={value}
              role="radio"
              icon={Languages}
              title={t(`languagePreferenceCard.options.${value}.title`)}
              description={t(`languagePreferenceCard.options.${value}.description`)}
              selected={language === value}
              onSelect={() => setLanguage(value)}
            />
          ))}
        </div>
        <Text variant="caption">{t('languagePreferenceCard.helperText')}</Text>
      </CardContent>
    </Card>
  )
}
