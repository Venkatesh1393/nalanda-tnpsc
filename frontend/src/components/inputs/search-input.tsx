import { Search, X } from 'lucide-react'
import { useMemo, useRef, useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { debounce } from '@/utils/debounce'

type SearchInputProps = Omit<ComponentProps<typeof Input>, 'onChange' | 'type'> & {
  /** Fires on every keystroke, uncontrolled-friendly. */
  onChange?: (value: string) => void
  /** Fires `delayMs` after the user stops typing — use this for the actual
   * network call (docs/Navigation.md §7's ~200ms debounce for Search). */
  onDebouncedChange?: (value: string) => void
  delayMs?: number
  onClear?: () => void
}

/**
 * The search field used by the global Search/Quick Actions overlay
 * (docs/Navigation.md §7) and any other in-page search — leading icon,
 * trailing clear button once there's a value, and a built-in debounce so
 * every caller doesn't hand-roll the same `debounce(utils/debounce.ts)` wiring.
 */
export function SearchInput({
  className,
  defaultValue,
  value: controlledValue,
  onChange,
  onDebouncedChange,
  delayMs = 200,
  onClear,
  ...props
}: SearchInputProps) {
  const { t } = useTranslation('common')
  const isControlled = controlledValue !== undefined
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ''))
  const value = isControlled ? String(controlledValue) : internalValue
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedEmit = useMemo(
    () => (onDebouncedChange ? debounce(onDebouncedChange, delayMs) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delayMs],
  )

  return (
    <div className="relative">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => {
          const next = event.target.value
          if (controlledValue === undefined) setInternalValue(next)
          onChange?.(next)
          debouncedEmit?.(next)
        }}
        className={cn('pr-8 pl-8', className)}
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label={t('a11y.clearSearch')}
          onClick={() => {
            if (controlledValue === undefined) setInternalValue('')
            onChange?.('')
            onDebouncedChange?.('')
            onClear?.()
            inputRef.current?.focus()
          }}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
