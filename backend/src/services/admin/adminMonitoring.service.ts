import type {
  SystemEventDocument,
  SystemEventSeverity,
  SystemEventType,
} from '../../models/SystemEvent.model'
import * as systemEventRepository from '../../repositories/systemEvent.repository'

/**
 * Sprint 4 Step 74 — Production Monitoring. Read-only admin visibility into
 * `SystemEvent` (errors, slow queries, slow requests, webhook failures) —
 * same shape as `adminAiUsage.service.ts`/`adminPayments.service.ts`: thin
 * aggregation over one repository, no mutation route (this is observability
 * only, matching every other admin monitoring surface in this codebase).
 */

export interface SystemEventDTO {
  id: string
  type: SystemEventType
  severity: SystemEventSeverity
  message: string
  source: string
  metadata?: Record<string, unknown>
  createdAt: string
}

function toDTO(event: SystemEventDocument): SystemEventDTO {
  return {
    id: event.id,
    type: event.type,
    severity: event.severity,
    message: event.message,
    source: event.source,
    metadata: event.metadata,
    createdAt: event.createdAt?.toISOString() ?? new Date().toISOString(),
  }
}

export async function listEvents(
  filter: { type?: SystemEventType; severity?: SystemEventSeverity; days: number },
  page: number,
  limit: number,
): Promise<{ items: SystemEventDTO[]; total: number; page: number; limit: number }> {
  const since = new Date(Date.now() - filter.days * 86_400_000)
  const { items, total } = await systemEventRepository.listForAdmin(
    { type: filter.type, severity: filter.severity, since },
    page,
    limit,
  )
  return { items: items.map(toDTO), total, page, limit }
}

export interface MonitoringSummaryDTO {
  since: string
  byType: Record<SystemEventType, number>
  bySeverity: Record<SystemEventSeverity, number>
  total: number
}

export async function getSummary(days: number): Promise<MonitoringSummaryDTO> {
  const since = new Date(Date.now() - days * 86_400_000)
  const rows = await systemEventRepository.getCountsSince(since)

  const byType = {} as Record<SystemEventType, number>
  const bySeverity = {} as Record<SystemEventSeverity, number>
  let total = 0

  for (const row of rows) {
    byType[row.type] = (byType[row.type] ?? 0) + row.count
    bySeverity[row.severity] = (bySeverity[row.severity] ?? 0) + row.count
    total += row.count
  }

  return { since: since.toISOString(), byType, bySeverity, total }
}
