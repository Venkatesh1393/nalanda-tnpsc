import type { PaymentStatus } from '../../constants/commerce'
import type { PaymentDocument } from '../../models/Payment.model'
import type { PaymentHistoryItemDTO } from '../payment.service'
import * as paymentRepository from '../../repositories/payment.repository'
import * as profileRepository from '../../repositories/profile.repository'
import * as systemEventRepository from '../../repositories/systemEvent.repository'
import * as userRepository from '../../repositories/user.repository'
import { ApiError } from '../../utils/ApiError'

/**
 * Read-only payment visibility for admin staff (Sprint 4 Step 56) —
 * "appropriate payment visibility," never a refund/edit control. Mirrors
 * `services/admin/adminSubscriptions.service.ts`'s shape exactly.
 */

export interface AdminPaymentSummaryDTO extends PaymentHistoryItemDTO {
  userId: string
  email: string
  name: string
}

function toSummary(
  payment: PaymentDocument,
  email: string,
  name: string,
): AdminPaymentSummaryDTO {
  return {
    id: payment.id,
    userId: payment.userId.toString(),
    tier: payment.tier,
    billingCycle: payment.billingCycle,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    failureReason: payment.failureReason ?? null,
    invoiceUrl: payment.invoiceUrl ?? null,
    createdAt: payment.createdAt?.toISOString() ?? null,
    email,
    name,
  }
}

export async function listPayments(
  filter: { userId?: string; status?: PaymentStatus },
  page: number,
  limit: number,
): Promise<{ items: AdminPaymentSummaryDTO[]; total: number; page: number; limit: number }> {
  const { items, total } = await paymentRepository.listForAdmin(filter, page, limit)

  const userIds = [...new Set(items.map((payment) => payment.userId.toString()))]
  const [users, profiles] = await Promise.all([
    Promise.all(userIds.map((id) => userRepository.findById(id))),
    profileRepository.findByUserIds(userIds),
  ])
  const emailByUserId = new Map(
    users.filter((user) => user !== null).map((user) => [user.id, user.email]),
  )
  const nameByUserId = new Map(
    profiles.map((profile) => [profile.userId.toString(), profile.name]),
  )

  return {
    items: items.map((payment) => {
      const userId = payment.userId.toString()
      const email = emailByUserId.get(userId) ?? 'unknown'
      return toSummary(payment, email, nameByUserId.get(userId) ?? email)
    }),
    total,
    page,
    limit,
  }
}

export async function getPayment(paymentId: string): Promise<AdminPaymentSummaryDTO> {
  const payment = await paymentRepository.findById(paymentId)
  if (!payment) throw ApiError.notFound('Payment not found')
  const userId = payment.userId.toString()
  const [user, profile] = await Promise.all([
    userRepository.findById(userId),
    profileRepository.findByUserId(userId),
  ])
  const email = user?.email ?? 'unknown'
  return toSummary(payment, email, profile?.name ?? email)
}

/**
 * Sprint 4 Step 74 — Production Monitoring ("Payments: Successful/Failures/
 * Webhook failures"). Combines `Payment` status counts (successful/failed/
 * refunded/still-pending checkouts) with `SystemEvent` webhook-failure
 * counts (`services/payment.service.ts#processWebhookPayload`'s signature/
 * parse failures) — two different collections because a webhook failure
 * doesn't always correspond to a known `Payment` row (a spoofed request
 * might reference no real order at all).
 */
export interface PaymentStatsDTO {
  since: string
  byStatus: Record<PaymentStatus, number>
  successRate: number | null
  webhookFailures: number
  recentFailures: AdminPaymentSummaryDTO[]
}

const RECENT_FAILURES_LIMIT = 10

function startOfDayUtc(daysAgo: number): Date {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (daysAgo - 1))
  return start
}

export async function getPaymentStats(days: number): Promise<PaymentStatsDTO> {
  const since = startOfDayUtc(days)

  const [statusRows, webhookFailureCounts, recentFailures] = await Promise.all([
    paymentRepository.getStatusCountsSince(since),
    systemEventRepository.getCountsSince(since),
    paymentRepository.listRecentFailures(since, RECENT_FAILURES_LIMIT),
  ])

  const byStatus = Object.fromEntries(
    statusRows.map((row) => [row.status, row.count]),
  ) as Record<PaymentStatus, number>

  const captured = byStatus.captured ?? 0
  const failed = byStatus.failed ?? 0
  // Only checkout attempts that actually resolved (captured or failed) —
  // still-`created` (abandoned/in-progress) rows shouldn't dilute the rate.
  const resolved = captured + failed
  const successRate = resolved > 0 ? captured / resolved : null

  const webhookFailures = webhookFailureCounts
    .filter((row) => row.type === 'webhook_failure')
    .reduce((sum, row) => sum + row.count, 0)

  const userIds = [...new Set(recentFailures.map((payment) => payment.userId.toString()))]
  const [users, profiles] = await Promise.all([
    Promise.all(userIds.map((id) => userRepository.findById(id))),
    profileRepository.findByUserIds(userIds),
  ])
  const emailByUserId = new Map(
    users.filter((user) => user !== null).map((user) => [user.id, user.email]),
  )
  const nameByUserId = new Map(
    profiles.map((profile) => [profile.userId.toString(), profile.name]),
  )

  return {
    since: since.toISOString(),
    byStatus,
    successRate,
    webhookFailures,
    recentFailures: recentFailures.map((payment) => {
      const userId = payment.userId.toString()
      const email = emailByUserId.get(userId) ?? 'unknown'
      return toSummary(payment, email, nameByUserId.get(userId) ?? email)
    }),
  }
}
