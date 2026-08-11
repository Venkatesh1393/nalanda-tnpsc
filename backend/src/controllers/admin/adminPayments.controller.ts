import type { Request, Response } from 'express'

import * as adminPaymentsService from '../../services/admin/adminPayments.service'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  ListAdminPaymentsQuery,
  StatsWindowQuery,
} from '../../validators/admin.validator'
import type { PaymentIdParams } from '../../validators/payments.validator'

export async function listPayments(req: Request, res: Response): Promise<void> {
  const { userId, status, page, limit } = req.query as unknown as ListAdminPaymentsQuery
  const result = await adminPaymentsService.listPayments({ userId, status }, page, limit)
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / result.limit) || 1,
  })
}

export async function getPayment(req: Request, res: Response): Promise<void> {
  const { paymentId } = req.params as unknown as PaymentIdParams
  const payment = await adminPaymentsService.getPayment(paymentId)
  sendSuccess(res, payment)
}

/** Sprint 4 Step 74 — Production Monitoring. */
export async function getPaymentStats(req: Request, res: Response): Promise<void> {
  const { days } = req.query as unknown as StatsWindowQuery
  const stats = await adminPaymentsService.getPaymentStats(days)
  sendSuccess(res, stats)
}
