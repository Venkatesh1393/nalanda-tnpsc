import type { Request, Response } from 'express'

import { HttpStatus } from '../constants/httpStatus'
import * as notificationService from '../services/notification.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import { resolveDisplayLanguage } from '../utils/language'
import type {
  ListQuery,
  NotificationIdParams,
} from '../validators/notification.validator'

export async function getNotifications(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const query = req.query as unknown as ListQuery
  const page = await notificationService.getNotifications(
    req.user.sub,
    { isRead: query.isRead, category: query.category, isArchived: query.isArchived },
    query.page,
    query.limit,
    lang,
  )
  sendSuccess(res, page.items, HttpStatus.OK, {
    page: page.page,
    limit: page.limit,
    total: page.total,
    totalPages: page.totalPages,
  })
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const unreadCount = await notificationService.getUnreadCount(req.user.sub)
  sendSuccess(res, { unreadCount })
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { notificationId = '' } = req.params as NotificationIdParams
  const result = await notificationService.markAsRead(req.user.sub, notificationId)
  sendSuccess(res, result)
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const result = await notificationService.markAllAsRead(req.user.sub)
  sendSuccess(res, result)
}

export async function archive(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { notificationId = '' } = req.params as NotificationIdParams
  const result = await notificationService.archive(req.user.sub, notificationId)
  sendSuccess(res, result)
}

export async function unarchive(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { notificationId = '' } = req.params as NotificationIdParams
  const result = await notificationService.unarchive(req.user.sub, notificationId)
  sendSuccess(res, result)
}

export async function remove(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { notificationId = '' } = req.params as NotificationIdParams
  await notificationService.remove(req.user.sub, notificationId)
  sendSuccess(res, { notificationId })
}
