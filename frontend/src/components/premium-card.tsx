import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/typography'
import { cn } from '@/lib/utils'

type PremiumCardProps = {
  /** The real content preview to blur — never a fake placeholder
   * (docs/UI_Design_System.md §36). */
  children: ReactNode
  /** e.g. "Unlock with Plus" — always specific, never a bare "Premium" banner. */
  unlockLabel: string
  onUnlock?: () => void
  className?: string
}

/**
 * The honest paywall/lock treatment (docs/UI_Design_System.md §36): a soft
 * blur over genuine content, a small lock icon, and a specific unlock label
 * — the pattern used anywhere free-tier content is gated (Learn PDFs,
 * deeper Analytics, unlimited Practice).
 */
export function PremiumCard({
  children,
  unlockLabel,
  onUnlock,
  className,
}: PremiumCardProps) {
  const { t } = useTranslation('common')
  return (
    <Card className={cn('relative overflow-hidden p-0', className)}>
      <div aria-hidden="true" className="pointer-events-none blur-sm select-none">
        {children}
      </div>
      <div className="from-background/40 to-background/95 absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b p-6 text-center">
        <span className="bg-premium-gold/10 text-premium-gold flex size-9 items-center justify-center rounded-full">
          <Lock className="size-4" aria-hidden="true" />
        </span>
        <Text variant="body-sm" className="max-w-[220px]">
          {unlockLabel}
        </Text>
        {onUnlock && (
          <Button size="sm" onClick={onUnlock}>
            {t('actions.upgrade')}
          </Button>
        )}
      </div>
    </Card>
  )
}
