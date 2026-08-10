import { motion } from 'framer-motion'
import { Bookmark } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { motionInstant } from '@/animations/variants'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BookmarkToggleButtonProps = {
  isBookmarked: boolean
  onToggle: () => void
  pending?: boolean
  /** Used only for the accessible label, e.g. "Newton's Laws of Motion". */
  label: string
  size?: 'icon-xs' | 'icon-sm' | 'icon'
  className?: string
}

/**
 * The bookmark icon toggle reused across Subtopic rows, Lesson Details,
 * Video, and Notes screens (docs/Learn_Module.md §3-§5) — a quick,
 * low-emphasis `motion-instant` scale-pulse on save, deliberately never the
 * stronger celebratory treatment reserved for genuine milestones
 * (docs/UI_Design_System.md §36's restraint principle: this is a light,
 * frequent action).
 */
export function BookmarkToggleButton({
  isBookmarked,
  onToggle,
  pending = false,
  label,
  size = 'icon-sm',
  className,
}: BookmarkToggleButtonProps) {
  const { t } = useTranslation('learn')

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      aria-pressed={isBookmarked}
      aria-label={
        isBookmarked
          ? t('bookmarkToggleButton.removeAriaLabel', { label })
          : t('bookmarkToggleButton.addAriaLabel', { label })
      }
      disabled={pending}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      className={cn('text-muted-foreground', isBookmarked && 'text-primary', className)}
    >
      <motion.span
        key={String(isBookmarked)}
        initial={{ scale: 0.85 }}
        animate={{ scale: 1 }}
        transition={motionInstant}
        className="inline-flex"
      >
        <Bookmark
          className={cn('size-4', isBookmarked && 'fill-current')}
          aria-hidden="true"
        />
      </motion.span>
    </Button>
  )
}
