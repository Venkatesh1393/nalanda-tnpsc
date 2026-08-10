import { RotateCw, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/typography'
import { cn } from '@/lib/utils'

type ErrorStateProps = {
  title?: string
  description?: string
  /** e.g. "Retry" — every error state per docs/UserJourney.md's cross-
   * cutting standards is paired with a clear next action, never a dead end. */
  retryLabel?: string
  onRetry?: () => void
  className?: string
}

/**
 * "Something went wrong" / "no connectivity" — deliberately distinct from
 * `EmptyState` ("no data yet"), per docs/UserJourney.md's rule that these
 * two require different messaging and different recovery actions.
 */
export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation('common')
  const resolvedTitle = title ?? t('errorState.title')
  const resolvedDescription = description ?? t('errorState.description')
  const resolvedRetryLabel = retryLabel ?? t('errorState.retryLabel')

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <span className="text-destructive bg-destructive/10 flex size-12 items-center justify-center rounded-full">
        <TriangleAlert className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <Heading variant="heading-4">{resolvedTitle}</Heading>
        <Text variant="body-sm" className="max-w-sm">
          {resolvedDescription}
        </Text>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RotateCw />
          {resolvedRetryLabel}
        </Button>
      )}
    </div>
  )
}
