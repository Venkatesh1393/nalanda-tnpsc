import type { Request, Response } from 'express'

import * as adminMonitoringService from '../../services/admin/adminMonitoring.service'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  ListSystemEventsQuery,
  StatsWindowQuery,
} from '../../validators/admin.validator'

export async function listEvents(req: Request, res: Response): Promise<void> {
  const { type, severity, days, page, limit } = req.query as unknown as ListSystemEventsQuery
  const result = await adminMonitoringService.listEvents({ type, severity, days }, page, limit)
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / result.limit) || 1,
  })
}

export async function getSummary(req: Request, res: Response): Promise<void> {
  const { days } = req.query as unknown as StatsWindowQuery
  const summary = await adminMonitoringService.getSummary(days)
  sendSuccess(res, summary)
}
