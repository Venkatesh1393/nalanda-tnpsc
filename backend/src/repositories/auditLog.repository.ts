import type { Types } from 'mongoose'

import { AuditLog, type AuditLogDocument, type IAuditLog } from '../models/AuditLog.model'

export function create(
  entry: Omit<IAuditLog, 'createdAt' | 'actorId'> & { actorId: Types.ObjectId | string },
): Promise<AuditLogDocument> {
  return AuditLog.create(entry)
}

export type AuditLogListFilter = {
  entityType?: string
  actorId?: string
}

export async function list(
  filter: AuditLogListFilter,
  page: number,
  limit: number,
): Promise<{ items: AuditLogDocument[]; total: number }> {
  const query: Record<string, unknown> = {}
  if (filter.entityType) query.entityType = filter.entityType
  if (filter.actorId) query.actorId = filter.actorId

  const [items, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLog.countDocuments(query),
  ])

  return { items, total }
}
