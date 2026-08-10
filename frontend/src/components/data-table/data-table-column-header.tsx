import type { Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>
  title: string
  className?: string
}

/**
 * A sortable column header cell — click toggles ascending → descending →
 * unsorted. Purely presentational on top of `@tanstack/react-table`'s own
 * sorting state; pass `column.getCanSort()` columns only.
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn('text-sm font-medium', className)}>{title}</div>
  }

  const sorted = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('-ml-2.5 h-7 gap-1.5 px-2.5', className)}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {title}
      {sorted === 'asc' && <ArrowUp className="size-3.5" aria-hidden="true" />}
      {sorted === 'desc' && <ArrowDown className="size-3.5" aria-hidden="true" />}
      {!sorted && (
        <ChevronsUpDown className="text-muted-foreground size-3.5" aria-hidden="true" />
      )}
    </Button>
  )
}
