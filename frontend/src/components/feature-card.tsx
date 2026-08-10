import { ArrowRight, type LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Heading, Text } from '@/components/typography'
import { cn } from '@/lib/utils'

type FeatureCardProps = ComponentProps<typeof Card> & {
  icon: LucideIcon
  title: string
  description: string
  /** AI Teal icon-chip treatment (docs/UI_Design_System.md §7, §35) —
   * reserved exclusively for AI-originated features (e.g. "AI Tutor").
   * Never apply to a non-AI feature card. */
  ai?: boolean
  /** "Learn more" affordance (docs/Landing_Page_Design.md §11) — a text
   * link, not a full button, so it doesn't compete with the page's own CTA. */
  onLearnMore?: () => void
  /** An optional small illustrative visual beneath the copy (e.g. the
   * Analytics card's mini percentile ring, docs/Landing_Page_Design.md §11d
   * — "a small illustrative mini version... rendered as a static preview
   * graphic"). Explicitly non-data-bearing decoration, never a real number
   * claim — the same distinction CLAUDE.md draws for design-system preview
   * data vs. real product content. */
  graphic?: ReactNode
}

/**
 * Landing-page feature grid card (docs/Landing_Page_Design.md §11): icon
 * chip → title → one-sentence benefit copy → subtle "Learn more" link.
 */
export function FeatureCard({
  icon: Icon,
  title,
  description,
  ai = false,
  onLearnMore,
  graphic,
  className,
  ...props
}: FeatureCardProps) {
  const { t } = useTranslation('common')
  return (
    <Card
      interactive={Boolean(onLearnMore)}
      className={cn(
        'gap-4 shadow-xs transition-shadow duration-200 hover:shadow-md motion-safe:transition-[box-shadow,transform] motion-safe:hover:-translate-y-0.5',
        className,
      )}
      {...props}
    >
      <CardHeader>
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-lg',
            ai ? 'bg-ai-teal/10 text-ai-teal' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Heading variant="heading-4">{title}</Heading>
        <Text variant="body-sm">{description}</Text>
        {onLearnMore && (
          <button
            type="button"
            onClick={onLearnMore}
            className="text-primary mt-1 inline-flex w-fit items-center gap-1 text-sm font-medium hover:underline"
          >
            {t('actions.learnMore')}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        )}
        {graphic && <div className="pt-1">{graphic}</div>}
      </CardContent>
    </Card>
  )
}
