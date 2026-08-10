import type { Request, Response } from 'express'

import * as auditLogService from '../../services/auditLog.service'
import { sendSuccess } from '../../utils/ApiResponse'
import type { AuditLogQuery } from '../../validators/admin.validator'

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const { entityType, actorId, page, limit } = req.query as unknown as AuditLogQuery
  const { items, total } = await auditLogService.getAuditLogs(
    { entityType, actorId },
    page,
    limit,
  )
  sendSuccess(res, items, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  })
}
