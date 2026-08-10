import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/typography'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

/**
 * "No data yet" — deliberately distinct from `ErrorState` ("no
 * connectivity"/failure), per docs/UserJourney.md's cross-cutting rule that
 * these two must never share one generic treatment. Used for a brand-new
 * user's Dashboard, an empty Bookmarks list, a subject with no topics yet,
 * etc. (docs/UI_Design_System.md §24).
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <span className="text-muted-foreground flex size-12 items-center justify-center rounded-full border">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <Heading variant="heading-4">{title}</Heading>
        {description && (
          <Text variant="body-sm" className="max-w-sm">
            {description}
          </Text>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
