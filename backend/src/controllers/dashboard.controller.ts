import type { Request, Response } from 'express'

import * as dashboardService from '../services/dashboard.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import { resolveDisplayLanguage } from '../utils/language'

export async function getDashboard(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const dashboard = await dashboardService.getDashboard(req.user.sub, lang)
  sendSuccess(res, dashboard)
}
