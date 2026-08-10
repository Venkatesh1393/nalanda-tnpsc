import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import { NOTIFICATION_CATEGORIES } from '../constants/notifications'

const optionalBoolString = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'))

export const listQuerySchema = z.object({
  isRead: optionalBoolString,
  /** Defaults to `false` server-side (`notification.repository.ts`'s
   * `findByUser`) when omitted — archived notifications stay out of the
   * default list. */
  isArchived: optionalBoolString,
  category: z.enum(NOTIFICATION_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type ListQuery = z.infer<typeof listQuerySchema>

/** `POST /admin/notifications/broadcast` (Sprint 4 Step 62) — Admin
 * Announcements. `title`/`body` mirror `NotificationContent`'s bilingual
 * shape exactly (English required, Tamil optional). */
export const broadcastNotificationBodySchema = z.object({
  title: z.object({ en: z.string().trim().min(1), ta: z.string().trim().optional() }),
  body: z.object({ en: z.string().trim().min(1), ta: z.string().trim().optional() }),
  deepLink: z.string().trim().optional(),
  actionLabel: z
    .object({ en: z.string().trim().min(1), ta: z.string().trim().optional() })
    .optional(),
})
export type BroadcastNotificationBody = z.infer<typeof broadcastNotificationBodySchema>

export const notificationIdParamsSchema = z.object({
  notificationId: z.string().refine(isValidObjectId, 'Invalid notificationId'),
})
export type NotificationIdParams = z.infer<typeof notificationIdParamsSchema>
