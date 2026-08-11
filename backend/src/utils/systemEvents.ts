import mongoose from 'mongoose'

import { logger } from '../config/logger'
import * as systemEventRepository from '../repositories/systemEvent.repository'
import type { ISystemEvent } from '../models/SystemEvent.model'

/**
 * Sprint 4 Step 74 — Production Monitoring. The single safe entry point for
 * writing a `SystemEvent` — every call site (`errorHandler.middleware.ts`,
 * `requestMonitoring.middleware.ts`, `config/database.ts`,
 * `services/payment.service.ts`) uses this instead of
 * `repositories/systemEvent.repository.ts#create` directly.
 *
 * **Never throws and never awaited by its caller on the hot path** —
 * recording a monitoring event must never be the reason a request fails or
 * slows down further, and must never recurse into itself (a DB write
 * failing while trying to record a monitoring event about... a DB problem).
 * Skips writing entirely rather than queuing/retrying when the database
 * isn't connected — exactly the situation `getReadiness`
 * (`controllers/health.controller.ts`) already surfaces via `GET
 * /api/health/ready`; a disconnected DB is already visible without this.
 * Checks `mongoose.connection.readyState` directly rather than importing
 * `config/database.ts#isDatabaseConnected` — `config/database.ts` itself
 * calls into this module (to record slow queries), so importing the other
 * direction here would be circular.
 */
export function recordSystemEvent(data: Omit<ISystemEvent, 'createdAt'>): void {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) return
  systemEventRepository.create(data).catch((error) => {
    logger.warn('Failed to record SystemEvent (non-fatal, continuing)', {
      type: data.type,
      error: error instanceof Error ? error.message : String(error),
    })
  })
}
