import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

/** A native `<select>`, styled to match the rest of the admin UI kit —
 * deliberately not a Radix-based combobox (no dependency needed for the
 * small, static option lists this foundation app uses: role/status/tier
 * filters). Swap for a richer component later if a page ever needs
 * search-as-you-type or multi-select. */
export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'border-input bg-background h-9 w-full appearance-none rounded-lg border px-3 pr-8 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2"
        aria-hidden="true"
      />
    </div>
  )
}
