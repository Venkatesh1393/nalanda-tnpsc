import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/utils'

type NotFoundProps = {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

/**
 * Missing-resource / unmatched-route state — composes `EmptyState` rather
 * than duplicating its markup, since a 404 is really just a specific,
 * pre-labeled empty state ("nothing here") with a way back, not a distinct
 * visual language of its own.
 */
export function NotFound({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: NotFoundProps) {
  const { t } = useTranslation('common')
  const resolvedTitle = title ?? t('notFound.title')
  const resolvedDescription = description ?? t('notFound.description')
  const resolvedActionLabel = actionLabel ?? t('notFound.actionLabel')

  return (
    <EmptyState
      icon={SearchX}
      title={resolvedTitle}
      description={resolvedDescription}
      actionLabel={onAction ? resolvedActionLabel : undefined}
      onAction={onAction}
      className={cn('py-24', className)}
    />
  )
}
