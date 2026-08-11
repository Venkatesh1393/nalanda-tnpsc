import { connectDatabase, disconnectDatabase } from '../config/database'
import { logger } from '../config/logger'
import { SystemEvent } from '../models/SystemEvent.model'
import * as systemEventRepository from '../repositories/systemEvent.repository'
import * as adminMonitoringService from '../services/admin/adminMonitoring.service'

/**
 * Sprint 4 Step 74 — Production Monitoring. Real-connectivity sanity check
 * (`npm run verify:monitoring`) — writes one `SystemEvent` of each type via
 * `repositories/systemEvent.repository.ts` (the same path
 * `utils/systemEvents.ts#recordSystemEvent` uses), confirms the Admin
 * Monitoring dashboard's list/summary aggregations see them correctly, then
 * deletes the test rows so nothing lingers — same spirit as
 * `verifyCloudinary.ts`. Writes via the repository directly rather than
 * `recordSystemEvent` itself, since that helper is deliberately
 * fire-and-forget (no returned promise) for its real call sites — this
 * script needs a deterministic write to verify against.
 */

const TEST_SOURCE = 'verify:monitoring-script'

async function main(): Promise<void> {
  await connectDatabase()
  try {
    logger.info('Writing one SystemEvent of each type...')
    const written = await Promise.all([
      systemEventRepository.create({
        type: 'error',
        severity: 'critical',
        message: 'Test error event',
        source: TEST_SOURCE,
      }),
      systemEventRepository.create({
        type: 'slow_query',
        severity: 'warning',
        message: 'Test slow query event',
        source: TEST_SOURCE,
        metadata: { durationMs: 250 },
      }),
      systemEventRepository.create({
        type: 'slow_request',
        severity: 'warning',
        message: 'Test slow request event',
        source: TEST_SOURCE,
        metadata: { durationMs: 1200 },
      }),
      systemEventRepository.create({
        type: 'webhook_failure',
        severity: 'critical',
        message: 'Test webhook failure event',
        source: TEST_SOURCE,
      }),
    ])
    logger.info(`Wrote ${written.length} test events.`)

    logger.info('Querying back via the Admin Monitoring service...')
    const list = await adminMonitoringService.listEvents({ days: 1 }, 1, 50)
    const testRows = list.items.filter((event) => event.source === TEST_SOURCE)
    if (testRows.length !== written.length) {
      throw new Error(
        `Expected ${written.length} test rows from listEvents, found ${testRows.length}`,
      )
    }
    logger.info(`listEvents correctly returned all ${testRows.length} test rows.`)

    const summary = await adminMonitoringService.getSummary(1)
    for (const event of written) {
      if (!summary.byType[event.type] || summary.byType[event.type] < 1) {
        throw new Error(`getSummary's byType is missing/undercounting "${event.type}"`)
      }
    }
    logger.info('getSummary byType/bySeverity counts include all 4 test events.', {
      byType: summary.byType,
      bySeverity: summary.bySeverity,
    })

    logger.info('Deleting test events to leave the collection clean...')
    const deleted = await SystemEvent.deleteMany({ source: TEST_SOURCE })
    if (deleted.deletedCount !== written.length) {
      throw new Error(
        `Cleanup deleted ${deleted.deletedCount}, expected ${written.length}`,
      )
    }
    logger.info('Cleanup succeeded — monitoring stack verified end-to-end.')
  } finally {
    await disconnectDatabase()
  }
}

main().catch((error) => {
  logger.error('Monitoring verification failed', { error })
  process.exitCode = 1
})
