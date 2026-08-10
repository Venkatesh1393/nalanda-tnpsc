import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  listPayments,
  type AdminPaymentSummary,
  type PaymentListFilter,
  type PaymentStatus,
} from '@/services/adminPaymentsService'

const STATUS_BADGE: Record<PaymentStatus, 'success' | 'warning' | 'destructive' | 'outline'> = {
  captured: 'success',
  created: 'outline',
  failed: 'destructive',
  refunded: 'warning',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatAmount(paise: number, currency: string): string {
  const symbol = currency === 'INR' ? '₹' : `${currency} `
  return `${symbol}${(paise / 100).toLocaleString('en-IN')}`
}

/**
 * Read-only payment visibility (Sprint 4 Step 56) — `GET /admin/payments`,
 * gated to `admin`/`support`/`super_admin` server-side, same "appropriate
 * visibility, never a manipulation control" boundary as the Subscriptions
 * tab. `filterUserId` is set when reached via that tab's "Payments" link
 * (one account's full history); clearing it shows every payment platform-
 * wide.
 */
export function PaymentsTab({
  filterUserId,
  onClearUserFilter,
}: {
  filterUserId: string | null
  onClearUserFilter: () => void
}) {
  const [status, setStatus] = useState<PaymentListFilter['status'] | ''>('')
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'payments', { userId: filterUserId, status, page }],
    queryFn: () =>
      listPayments({
        userId: filterUserId ?? undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {filterUserId && (
          <Badge variant="secondary" className="w-fit gap-1.5">
            Filtered to one account
            <button
              type="button"
              onClick={onClearUserFilter}
              className="hover:text-foreground ml-1"
              aria-label="Clear account filter"
            >
              ×
            </button>
          </Badge>
        )}
        <Select
          className="sm:w-40"
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value as PaymentListFilter['status'])
          }}
        >
          <option value="">All statuses</option>
          <option value="created">Pending</option>
          <option value="captured">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-0">
          {isError ? (
            <div className="p-4 sm:p-5">
              <ErrorState title="Couldn't load payments" onRetry={() => void refetch()} />
            </div>
          ) : isPending || !data ? (
            <div className="flex flex-col gap-2 p-4 sm:p-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState title="No payments match this filter" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Account</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Plan</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Amount</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Order / Payment ID</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((payment: AdminPaymentSummary) => (
                    <tr key={payment.id} className="hover:bg-muted/40 border-b last:border-0">
                      <td className="px-4 py-2.5 sm:px-5">
                        <div className="font-medium">{payment.name}</div>
                        <div className="text-muted-foreground text-xs">{payment.email}</div>
                      </td>
                      <td className="px-4 py-2.5 capitalize sm:px-5">
                        {payment.tier}
                        <span className="text-muted-foreground ml-1 text-xs capitalize">
                          ({payment.billingCycle})
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums sm:px-5">
                        {formatAmount(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <Badge variant={STATUS_BADGE[payment.status]} className="capitalize">
                          {payment.status}
                        </Badge>
                        {payment.status === 'failed' && payment.failureReason && (
                          <div className="text-muted-foreground mt-0.5 text-xs">
                            {payment.failureReason}
                          </div>
                        )}
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 font-mono text-xs sm:px-5">
                        {payment.id}
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 sm:px-5">
                        {formatDate(payment.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Page {data.page} of {data.totalPages} · {data.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
