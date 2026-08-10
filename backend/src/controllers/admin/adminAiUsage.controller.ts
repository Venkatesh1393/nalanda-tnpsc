import type { Request, Response } from 'express'

import * as adminAiUsageService from '../../services/admin/adminAiUsage.service'
import { sendSuccess } from '../../utils/ApiResponse'
import type { AiUsageDashboardQuery } from '../../validators/admin.validator'

export async function getUsageDashboard(req: Request, res: Response): Promise<void> {
  const { days, limit } = req.query as unknown as AiUsageDashboardQuery
  const dashboard = await adminAiUsageService.getUsageDashboard(days, limit)
  sendSuccess(res, dashboard)
}
