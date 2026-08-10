import type { Request, Response } from 'express'

import * as notificationService from '../../services/notification.service'
import { sendSuccess } from '../../utils/ApiResponse'
import type { BroadcastNotificationBody } from '../../validators/notification.validator'

/** `POST /admin/notifications/broadcast` (Sprint 4 Step 62 — Admin
 * Announcements) — wires the already-real `broadcastSystemNotice` (built
 * alongside `achievement` in earlier notification work but never exposed
 * over HTTP) to a real, RBAC-gated admin endpoint. */
export async function broadcast(req: Request, res: Response): Promise<void> {
  const body = req.body as BroadcastNotificationBody
  const notifiedCount = await notificationService.broadcastSystemNotice(body)
  sendSuccess(res, { notifiedCount })
}
