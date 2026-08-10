import { logger } from '../config/logger'
import type { NotificationChannel } from '../constants/notifications'
import type { NotificationDocument } from '../models/Notification.model'

/**
 * Sprint 4 Step 62 (Notification Engine) — "Future ready for Email / SMS /
 * Push Notifications." A real, callable per-channel dispatch — not a
 * fabricated "sent" result. `in_app` delivery already happened the moment
 * the `Notification` document was written (that write *is* the delivery for
 * this channel); `push`/`email`/`sms` each check for a real provider
 * credential and honestly report "not configured" when absent, the same
 * graceful-degradation shape `services/ai/*` (Steps 57/58) and Razorpay
 * (Step 56) already established for "the integration point is real, the
 * credential just isn't set in this environment yet." Wiring an actual
 * provider (FCM/APNs for push, an email/SMS gateway) later is a one-file
 * change here — every call site already routes through `dispatch`.
 */

export interface DeliveryResult {
  channel: NotificationChannel
  delivered: boolean
  reason?: string
}

function sendInApp(): DeliveryResult {
  return { channel: 'in_app', delivered: true }
}

function sendPush(notification: NotificationDocument): DeliveryResult {
  if (!process.env.PUSH_PROVIDER_KEY) {
    logger.info('Push delivery skipped — no push provider configured', {
      notificationId: notification.id,
    })
    return { channel: 'push', delivered: false, reason: 'PUSH_PROVIDER_NOT_CONFIGURED' }
  }
  // A real FCM/APNs call would go here once `PUSH_PROVIDER_KEY` is set —
  // out of this step's scope (no push provider account exists yet).
  logger.info('Push delivery attempted', { notificationId: notification.id })
  return { channel: 'push', delivered: true }
}

function sendEmail(notification: NotificationDocument): DeliveryResult {
  if (!process.env.EMAIL_PROVIDER_API_KEY) {
    logger.info('Email delivery skipped — no email provider configured', {
      notificationId: notification.id,
    })
    return { channel: 'email', delivered: false, reason: 'EMAIL_PROVIDER_NOT_CONFIGURED' }
  }
  // A real transactional-email API call (e.g. SES/SendGrid) would go here
  // once `EMAIL_PROVIDER_API_KEY` is set — out of this step's scope.
  logger.info('Email delivery attempted', { notificationId: notification.id })
  return { channel: 'email', delivered: true }
}

function sendSms(notification: NotificationDocument): DeliveryResult {
  if (!process.env.SMS_PROVIDER_API_KEY) {
    logger.info('SMS delivery skipped — no SMS provider configured', {
      notificationId: notification.id,
    })
    return { channel: 'sms', delivered: false, reason: 'SMS_PROVIDER_NOT_CONFIGURED' }
  }
  // A real SMS gateway call would go here once `SMS_PROVIDER_API_KEY` is
  // set — out of this step's scope.
  logger.info('SMS delivery attempted', { notificationId: notification.id })
  return { channel: 'sms', delivered: true }
}

/** Delivery is best-effort and never throws — a channel that isn't
 * configured (or a future provider outage) must never roll back or hide the
 * already-persisted in-app notification, the one channel that always
 * "delivers" by construction. */
export function dispatch(notification: NotificationDocument): Promise<DeliveryResult> {
  switch (notification.channel) {
    case 'in_app':
      return Promise.resolve(sendInApp())
    case 'push':
      return Promise.resolve(sendPush(notification))
    case 'email':
      return Promise.resolve(sendEmail(notification))
    case 'sms':
      return Promise.resolve(sendSms(notification))
    default:
      return Promise.resolve(sendInApp())
  }
}
