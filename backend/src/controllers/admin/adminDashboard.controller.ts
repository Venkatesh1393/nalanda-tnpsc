import type { Request, Response } from 'express'

import * as adminDashboardService from '../../services/admin/adminDashboard.service'
import { sendSuccess } from '../../utils/ApiResponse'

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  const stats = await adminDashboardService.getDashboardStats()
  sendSuccess(res, stats)
}
