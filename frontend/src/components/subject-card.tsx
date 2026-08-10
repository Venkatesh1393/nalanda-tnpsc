import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Text } from '@/components/typography'
import { cn } from '@/lib/utils'

type SubjectCardProps = ComponentProps<typeof Card> & {
  icon: LucideIcon
  name: string
  /** e.g. "12 topics" (docs/Learn_Module.md §1) — pass the already-formatted
   * string so this component stays language-agnostic. */
  itemCountLabel: string
  /** 0-100. Omit for a subject with no progress yet (Subjects/Topics-level
   * cards only track progress once the user has engaged with content). */
  progress?: number
  onSelect?: () => void
}

/**
 * The Learn module's Subject/Topic-level card (docs/Learn_Module.md §1-§2):
 * pictogram, name, an item-count line, and a slim per-subject progress bar.
 * Also doubles as a generic "Course Card" — the docs never distinguish the
 * two, so this one component covers both rather than duplicating near-
 * identical markup (per CLAUDE.md's no-duplication rule).
 */
export function SubjectCard({
  icon: Icon,
  name,
  itemCountLabel,
  progress,
  onSelect,
  className,
  ...props
}: SubjectCardProps) {
  const { t } = useTranslation('common')
  return (
    <Card
      interactive={Boolean(onSelect)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
      className={cn(className)}
      {...props}
    >
      <CardContent className="flex flex-col gap-3">
        <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-0.5">
          <Text as="span" variant="body-lg" className="font-medium">
            {name}
          </Text>
          <Text as="span" variant="body-sm">
            {itemCountLabel}
          </Text>
        </div>
        {progress !== undefined && (
          <Progress
            value={progress}
            aria-label={t('a11y.progressOf', { name })}
            className="h-1.5"
          />
        )}
      </CardContent>
    </Card>
  )
}
