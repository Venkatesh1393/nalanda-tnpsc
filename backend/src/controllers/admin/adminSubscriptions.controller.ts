import type { Request, Response } from 'express'

import * as adminSubscriptionsService from '../../services/admin/adminSubscriptions.service'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  ListSubscriptionsQuery,
  UserIdParams,
} from '../../validators/admin.validator'

export async function listSubscriptions(req: Request, res: Response): Promise<void> {
  const { tier, page, limit } = req.query as unknown as ListSubscriptionsQuery
  const result = await adminSubscriptionsService.listSubscriptions({ tier }, page, limit)
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / result.limit) || 1,
  })
}

export async function getSubscription(req: Request, res: Response): Promise<void> {
  const { userId } = req.params as unknown as UserIdParams
  const subscription = await adminSubscriptionsService.getSubscriptionForUser(userId)
  sendSuccess(res, subscription)
}
