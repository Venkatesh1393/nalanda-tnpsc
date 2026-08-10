import { useId, type ComponentProps } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FormFieldProps = ComponentProps<typeof Input> & {
  label: string
  /** Inline validation message (docs/UI_Design_System.md §15) — shown below
   * the field in `destructive` color, never as a separate error-summary banner. */
  error?: string
  hint?: string
}

/**
 * The full field pattern from docs/UI_Design_System.md §15: a label always
 * visible above the input (never placeholder-as-label), with an optional
 * hint or inline error below. Compose Label/Input separately instead of this
 * wrapper only when a field's layout genuinely doesn't fit this shape (e.g.
 * the segmented OTP input in docs/OTP_Flow.md).
 */
export function FormField({
  label,
  error,
  hint,
  id,
  className,
  ...inputProps
}: FormFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
        {...inputProps}
      />
      {error ? (
        <p id={descriptionId} className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
