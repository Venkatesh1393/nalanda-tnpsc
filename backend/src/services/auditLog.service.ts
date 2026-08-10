import type { Role } from '../constants/roles'
import type { AuditLogDocument } from '../models/AuditLog.model'
import * as auditLogRepository from '../repositories/auditLog.repository'

export type AuditActor = {
  id: string
  email: string
  role: Role
}

export interface AuditLogDTO {
  id: string
  actor: { id: string; email: string; role: Role }
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown>
  createdAt: Date | null
}

function toDTO(entry: AuditLogDocument): AuditLogDTO {
  return {
    id: entry.id,
    actor: {
      id: entry.actorId.toString(),
      email: entry.actorEmail,
      role: entry.actorRole,
    },
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata,
    createdAt: entry.createdAt ?? null,
  }
}

/**
 * Writes one audit entry — every admin service that mutates something
 * privileged (user status, user role, and future content/subscription
 * actions) calls this immediately after the mutation succeeds. `metadata`
 * must be a small, explicitly-built object (previous/new values, counts) —
 * never a raw request body or anything that could contain a token/secret,
 * per `AuditLog.model.ts`'s own "no secrets" rule.
 */
export function recordAction(
  actor: AuditActor,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
): Promise<AuditLogDocument> {
  return auditLogRepository.create({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    metadata,
  })
}

export async function getAuditLogs(
  filter: { entityType?: string; actorId?: string },
  page: number,
  limit: number,
): Promise<{ items: AuditLogDTO[]; total: number }> {
  const { items, total } = await auditLogRepository.list(filter, page, limit)
  return { items: items.map(toDTO), total }
}
