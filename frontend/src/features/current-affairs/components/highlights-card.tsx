import { ListChecks } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Heading, Text } from '@/components/typography'

type HighlightsCardProps = {
  highlights: string[]
}

/** The "Important Highlights" callout on an article's detail screen — a
 * short, scannable bullet summary distinct from the full body text, styled
 * with a subtle brand-tinted background (the same `primary-50`-style
 * emphasis wash the Dashboard's Continue Learning card uses for "the one
 * card that should stand out slightly," docs/UI_Design_System.md §37). */
export function HighlightsCard({ highlights }: HighlightsCardProps) {
  const { t } = useTranslation('currentAffairs')

  if (highlights.length === 0) return null

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="flex-row items-center gap-2">
        <ListChecks className="text-primary size-4.5" aria-hidden="true" />
        <Heading variant="heading-4">{t('highlightsCard.heading')}</Heading>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {highlights.map((point, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
              <Text variant="body-sm" className="text-foreground">
                {point}
              </Text>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
