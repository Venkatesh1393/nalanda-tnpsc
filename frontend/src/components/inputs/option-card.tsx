import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Heading, Text } from '@/components/typography'
import { cn } from '@/lib/utils'

type OptionCardProps = {
  selected: boolean
  title: string
  description?: string
  icon?: LucideIcon
  onSelect: () => void
  /** 'radio' for single-select groups, 'checkbox' for multi-select groups —
   * drives the ARIA role/state so a screen reader announces this exactly
   * like the native control it visually replaces (docs/UI_Design_System.md
   * §31), matching the interactive-card pattern already established by
   * `features/auth/components/register-path-selector.tsx`. */
  role: 'radio' | 'checkbox'
  disabled?: boolean
  className?: string
}

/**
 * A single tappable, icon+title+description selection card — the shared
 * building block behind every "pick one or more of these cards" step in
 * Onboarding (docs/Onboarding.md Screens 1, 2, 4, and the Learning Style
 * step), so each step only supplies its own options/copy rather than
 * re-implementing card selection, focus, and keyboard handling per step.
 */
export function OptionCard({
  selected,
  title,
  description,
  icon: Icon,
  onSelect,
  role,
  disabled = false,
  className,
}: OptionCardProps) {
  return (
    <Card
      interactive={!disabled}
      role={role}
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'shadow-xs transition-shadow duration-200 motion-safe:transition-[box-shadow,transform]',
        !disabled && 'hover:shadow-md motion-safe:hover:-translate-y-0.5',
        selected && 'ring-primary bg-primary/5 ring-2',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <CardHeader className="flex-row items-center gap-3">
        {Icon && (
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
        <span
          aria-hidden="true"
          className={cn(
            'ml-auto flex size-5 shrink-0 items-center justify-center rounded-full border',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input',
          )}
        >
          {selected && <Check className="size-3.5" />}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
        <Heading variant="heading-4">{title}</Heading>
        {description && <Text variant="body-sm">{description}</Text>}
      </CardContent>
    </Card>
  )
}
