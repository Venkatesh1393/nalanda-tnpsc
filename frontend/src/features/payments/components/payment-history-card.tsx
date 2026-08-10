import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/hooks/use-language'
import { getPaymentHistory } from '@/services/paymentsService'
import { formatNumber } from '@/utils/format-date'
import type { PaymentStatus } from '@/types/payments'

const STATUS_BADGE_VARIANT: Record<PaymentStatus, 'success' | 'warning' | 'destructive' | 'outline'> = {
  captured: 'success',
  created: 'outline',
  failed: 'destructive',
  refunded: 'warning',
}

function formatDate(iso: string | null, language: 'en' | 'ta'): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Sprint 4 Step 56 — Plan/Amount/Status/Date/Receipt, exactly the columns
 * this step's "Payment History" requirement lists. `invoiceUrl` is honestly
 * absent for every payment today (no Razorpay Invoices API integration —
 * Orders API checkout doesn't generate one) — the receipt column shows
 * "—" rather than a fabricated link, per this step's "where available"
 * hedge on that requirement.
 */
export function PaymentHistoryCard() {
  const { t } = useTranslation(['payments', 'landing'])
  const { language } = useLanguage()

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['payments', 'invoices'],
    queryFn: () => getPaymentHistory(1, 20),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('payments:history.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        {isError ? (
          <div className="p-4 sm:p-5">
            <ErrorState
              title={t('payments:history.loadErrorTitle')}
              onRetry={() => void refetch()}
            />
          </div>
        ) : isPending || !data ? (
          <div className="flex flex-col gap-2 p-4 sm:p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState title={t('payments:history.empty')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="px-4 py-2.5 font-medium sm:px-5">
                    {t('payments:history.columns.plan')}
                  </th>
                  <th className="px-4 py-2.5 font-medium sm:px-5">
                    {t('payments:history.columns.amount')}
                  </th>
                  <th className="px-4 py-2.5 font-medium sm:px-5">
                    {t('payments:history.columns.status')}
                  </th>
                  <th className="px-4 py-2.5 font-medium sm:px-5">
                    {t('payments:history.columns.date')}
                  </th>
                  <th className="px-4 py-2.5 font-medium sm:px-5">
                    {t('payments:history.columns.receipt')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/40 border-b last:border-0">
                    <td className="px-4 py-2.5 capitalize sm:px-5">
                      {t(`landing:pricing.tiers.${payment.tier}`)}
                      <span className="text-muted-foreground ml-1 text-xs capitalize">
                        ({payment.billingCycle})
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums sm:px-5">
                      ₹{formatNumber(payment.amount / 100, language)}
                    </td>
                    <td className="px-4 py-2.5 sm:px-5">
                      <Badge variant={STATUS_BADGE_VARIANT[payment.status]} className="capitalize">
                        {t(`payments:history.status.${payment.status}`)}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 sm:px-5">
                      {formatDate(payment.createdAt, language)}
                    </td>
                    <td className="px-4 py-2.5 sm:px-5">
                      {payment.invoiceUrl ? (
                        <a
                          href={payment.invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {t('payments:history.viewReceipt')}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
