import * as React from 'react'

import { cn } from '@/lib/utils'

/** A native `<input type="checkbox">`, styled to match the rest of the kit —
 * same "no Radix dependency needed for a small, static app" precedent as
 * `select.tsx`. */
export function Checkbox({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'border-input accent-primary size-4 rounded border outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
