import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

const sizeClasses = {
  sm: 'size-3.5',
  default: 'size-4',
  lg: 'size-5',
} as const

type SpinnerProps = {
  size?: keyof typeof sizeClasses
  className?: string
  /** Visually-hidden text for assistive tech — the spinner itself is decorative. */
  label?: string
}

/**
 * The single spinner used anywhere the product needs a short, unpredictable-
 * duration inline loading indicator (docs/UI_Design_System.md §25) — e.g.
 * inside a loading Button (components/ui/button.tsx's `loading` prop). For
 * full-section/page loads with a known layout, prefer `ui/skeleton.tsx`
 * instead; a bare spinner is reserved for short operations per that doc.
 */
export function Spinner({ size = 'default', className, label }: SpinnerProps) {
  const { t } = useTranslation('common')
  return (
    <>
      <Loader2
        aria-hidden="true"
        className={cn('animate-spin', sizeClasses[size], className)}
      />
      <span className="sr-only">{label ?? t('spinner.loading')}</span>
    </>
  )
}
