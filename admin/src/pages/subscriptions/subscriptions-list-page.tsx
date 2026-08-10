import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { PaymentsTab } from './payments-tab'
import { SubscriptionsTab } from './subscriptions-tab'

type Tab = 'subscriptions' | 'payments'

const TABS: { id: Tab; label: string }[] = [
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'payments', label: 'Payments' },
]

/**
 * Subscriptions (Sprint 4 Step 55) + Payments (Sprint 4 Step 56) — one page,
 * two tabs, same "one hub page" precedent `pages/content/content-management-
 * page.tsx` (Step 54) already set, rather than a new top-level nav item
 * (Step 52's original requested route list didn't include a separate
 * Payments page). Both tabs are read-only, gated to `admin`/`support`/
 * `super_admin` server-side — plan/payment state only ever changes through
 * the real, Razorpay-verified checkout flow, never a form here.
 */
export function SubscriptionsListPage() {
  const [tab, setTab] = useState<Tab>('subscriptions')
  const [paymentsUserFilter, setPaymentsUserFilter] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Subscriptions & Payments</h1>
        <p className="text-muted-foreground text-sm">
          Inspect every account's plan, status, entitlements, and payment history.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? 'default' : 'outline'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'subscriptions' && (
        <SubscriptionsTab
          onViewPayments={(userId) => {
            setPaymentsUserFilter(userId)
            setTab('payments')
          }}
        />
      )}
      {tab === 'payments' && (
        <PaymentsTab
          filterUserId={paymentsUserFilter}
          onClearUserFilter={() => setPaymentsUserFilter(null)}
        />
      )}
    </div>
  )
}
