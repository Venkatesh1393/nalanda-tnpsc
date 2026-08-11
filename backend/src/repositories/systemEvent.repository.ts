import {
  SystemEvent,
  type ISystemEvent,
  type SystemEventDocument,
  type SystemEventSeverity,
  type SystemEventType,
} from '../models/SystemEvent.model'

export function create(data: Omit<ISystemEvent, 'createdAt'>): Promise<SystemEventDocument> {
  return SystemEvent.create(data)
}

export interface SystemEventListFilter {
  type?: SystemEventType
  severity?: SystemEventSeverity
  since?: Date
}

function buildQuery(filter: SystemEventListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (filter.type) query.type = filter.type
  if (filter.severity) query.severity = filter.severity
  if (filter.since) query.createdAt = { $gte: filter.since }
  return query
}

export async function listForAdmin(
  filter: SystemEventListFilter,
  page: number,
  limit: number,
): Promise<{ items: SystemEventDocument[]; total: number }> {
  const query = buildQuery(filter)
  const [items, total] = await Promise.all([
    SystemEvent.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    SystemEvent.countDocuments(query),
  ])
  return { items, total }
}

export interface SystemEventCountRow {
  type: SystemEventType
  severity: SystemEventSeverity
  count: number
}

/** Grouped counts since `since` — the Admin Monitoring dashboard's summary
 * view (`services/admin/adminMonitoring.service.ts`). */
export async function getCountsSince(since: Date): Promise<SystemEventCountRow[]> {
  const rows = await SystemEvent.aggregate<{
    _id: { type: SystemEventType; severity: SystemEventSeverity }
    count: number
  }>([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { type: '$type', severity: '$severity' }, count: { $sum: 1 } } },
  ])
  return rows.map((row) => ({ type: row._id.type, severity: row._id.severity, count: row.count }))
}
