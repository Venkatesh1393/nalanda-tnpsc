import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { AlignJustify, Rows3 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTablePagination } from '@/components/data-table/data-table-pagination'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  emptyLabel?: string
  /** Shows the compact-row-height toggle (docs/UI_Design_System.md §16 —
   * "a compact row-height toggle for Admin users managing large question
   * banks"). Off by default since most non-Admin tables don't need it. */
  showDensityToggle?: boolean
  pageSize?: number
}

/**
 * The Admin Panel's workhorse table (docs/UI_Design_System.md §16) — sortable
 * columns (`DataTableColumnHeader`), pagination (`DataTablePagination`), and
 * an optional dense-row-height toggle. Deliberately no built-in zebra
 * striping, per the design system's "relies on generous row height and
 * hover states instead of stripes" rule — `ui/table.tsx` already applies
 * the correct row-hover treatment.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  emptyLabel,
  showDensityToggle = false,
  pageSize = 10,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation('common')
  const [sorting, setSorting] = useState<SortingState>([])
  const [dense, setDense] = useState(false)

  // TanStack Table's returned functions are intentionally not stable across
  // renders (its own internal memoization handles that), so the React
  // Compiler correctly skips memoizing this component rather than risk stale
  // UI from a mismemoized value — expected and safe to leave un-memoized.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageSize } },
  })

  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col gap-3">
      {showDensityToggle && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              dense ? t('dataTable.switchToComfortable') : t('dataTable.switchToCompact')
            }
            aria-pressed={dense}
            onClick={() => setDense((prev) => !prev)}
          >
            {dense ? <Rows3 /> : <AlignJustify />}
          </Button>
        </div>
      )}

      <div className="ring-foreground/10 overflow-hidden rounded-xl ring-1">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={cn(dense && 'h-8')}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn(dense && 'py-1')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState
                    title={emptyLabel ?? t('dataTable.noResults')}
                    className="border-none"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  )
}
