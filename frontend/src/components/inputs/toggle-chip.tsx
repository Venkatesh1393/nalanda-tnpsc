import { cn } from '@/lib/utils'

type ToggleChipProps = {
  selected: boolean
  label: string
  onSelect: () => void
  /** 'radio' for single-select groups, 'checkbox' for multi-select groups —
   * see `OptionCard` for the same rationale. */
  role: 'radio' | 'checkbox'
  disabled?: boolean
  className?: string
}

/**
 * A compact, text-only pill toggle — for option sets dense enough that a
 * full `OptionCard` per item would be excessive (docs/Onboarding.md Screen 3's
 * month chips, Screen 5's subject chips: "each presented as a simple toggle
 * chip"). A real `<button>` under the hood, so keyboard/focus/click all come
 * free; the `role`/`aria-checked` pair overrides the implicit button
 * semantics to match the group it's part of.
 */
export function ToggleChip({
  selected,
  label,
  onSelect,
  role,
  disabled = false,
  className,
}: ToggleChipProps) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'focus-visible:ring-ring/50 focus-visible:border-ring rounded-full border px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3',
        'pointer-coarse:min-h-11',
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-input text-foreground hover:bg-muted',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {label}
    </button>
  )
}
