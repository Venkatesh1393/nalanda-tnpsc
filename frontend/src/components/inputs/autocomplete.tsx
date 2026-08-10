import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type AutocompleteOption = {
  value: string
  label: string
}

type AutocompleteProps = {
  options: AutocompleteOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  emptyLabel?: string
  className?: string
}

/**
 * The standard Combobox pattern (Popover + Command, per the shadcn/ui
 * recipe both primitives already installed here are built for) — a
 * type-to-filter dropdown for single selection from a list too long to
 * scan as a plain `ui/select.tsx` (e.g. a subject/topic picker, an
 * institute-code lookup).
 */
export function Autocomplete({
  options,
  value,
  onChange,
  placeholder,
  emptyLabel,
  className,
}: AutocompleteProps) {
  const { t } = useTranslation('common')
  const resolvedPlaceholder = placeholder ?? t('select.placeholder')
  const resolvedEmptyLabel = emptyLabel ?? t('select.noResultsFound')
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          {selected ? selected.label : resolvedPlaceholder}
          <ChevronsUpDown
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={resolvedPlaceholder} />
          <CommandList>
            <CommandEmpty>{resolvedEmptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-1 size-4',
                      option.value === value ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden="true"
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
