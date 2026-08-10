import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  listSubscriptions,
  type AdminSubscriptionSummary,
  type SubscriptionListFilter,
  type SubscriptionStatus,
} from '@/services/adminSubscriptionsService'

const STATUS_BADGE: Record<SubscriptionStatus, 'success' | 'warning' | 'destructive' | 'outline'> = {
  active: 'success',
  past_due: 'warning',
  cancelled: 'destructive',
  expired: 'destructive',
  inactive: 'outline',
}

const FEATURE_LABEL: Record<string, string> = {
  ai_explanations: 'AI Explanations',
  ai_tutor: 'AI Tutor',
  premium_practice: 'Premium Practice',
  advanced_analytics: 'Advanced Analytics',
  premium_study_material: 'Premium Study Material',
  additional_mock_exams: 'Additional Mock Exams',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function entitledFeatures(summary: AdminSubscriptionSummary): string[] {
  return Object.entries(summary.entitlements)
    .filter(([, entitled]) => entitled)
    .map(([feature]) => FEATURE_LABEL[feature] ?? feature)
}

/**
 * Read-only subscription inspection (Sprint 4 Step 55) — `GET
 * /admin/subscriptions` is real, backed by `User.subscriptionTier` +
 * `Subscription` documents where one exists, gated to `admin`/`support`/
 * `super_admin` server-side. There is deliberately no edit control anywhere
 * on this page — Step 55's explicit "do not allow unsafe manual payment
 * manipulation" boundary. Changing a plan requires the real, Razorpay-
 * verified activation flow (Step 56), never a form here. The "Payments"
 * link per row switches to the sibling tab pre-filtered to that account.
 */
export function SubscriptionsTab({
  onViewPayments,
}: {
  onViewPayments: (userId: string) => void
}) {
  const [tier, setTier] = useState<SubscriptionListFilter['tier'] | ''>('')
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'subscriptions', { tier, page }],
    queryFn: () => listSubscriptions({ tier: tier || undefined, page, limit: 20 }),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <Select
          className="sm:w-44"
          value={tier}
          onChange={(e) => {
            setPage(1)
            setTier(e.target.value as SubscriptionListFilter['tier'])
          }}
        >
          <option value="">All plans</option>
          <option value="premium">Premium (any paid plan)</option>
          <option value="free">Free</option>
          <option value="plus">Plus</option>
          <option value="pro">Pro</option>
          <option value="institutional">Institutional</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-0">
          {isError ? (
            <div className="p-4 sm:p-5">
              <ErrorState
                title="Couldn't load subscriptions"
                onRetry={() => void refetch()}
              />
            </div>
          ) : isPending || !data ? (
            <div className="flex flex-col gap-2 p-4 sm:p-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState title="No accounts match this filter" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Account</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Plan</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Billing</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Start</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">End</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Entitlements</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((summary) => {
                    const features = entitledFeatures(summary)
                    return (
                      <tr
                        key={summary.userId}
                        className="hover:bg-muted/40 border-b last:border-0 align-top"
                      >
                        <td className="px-4 py-2.5 sm:px-5">
                          <div className="font-medium">{summary.name}</div>
                          <div className="text-muted-foreground text-xs">{summary.email}</div>
                        </td>
                        <td className="px-4 py-2.5 capitalize sm:px-5">{summary.tier}</td>
                        <td className="px-4 py-2.5 sm:px-5">
                          <Badge variant={STATUS_BADGE[summary.status]} className="capitalize">
                            {summary.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 capitalize sm:px-5">
                          {summary.billingCycle ?? '—'}
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5 sm:px-5">
                          {formatDate(summary.startDate)}
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5 sm:px-5">
                          {formatDate(summary.endDate)}
                        </td>
                        <td className="px-4 py-2.5 sm:px-5">
                          {features.length === 0 ? (
                            <span className="text-muted-foreground text-xs">None</span>
                          ) : (
                            <div className="flex max-w-64 flex-wrap gap-1">
                              {features.map((feature) => (
                                <Badge key={feature} variant="secondary">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 sm:px-5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewPayments(summary.userId)}
                          >
                            Payments
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
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
