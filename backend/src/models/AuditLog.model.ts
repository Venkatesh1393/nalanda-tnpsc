import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { ROLES, type Role } from '../constants/roles'

/**
 * Append-only record of privileged Admin Panel actions (Sprint 4 Step 52 —
 * Admin Portal Foundation, docs/Architecture.md §10's "Auditability" row and
 * docs/FolderStructure.md §11's `AuditLog.model.ts`). Every admin mutation
 * (status change, role change, and future content/subscription actions)
 * writes one document here via `services/auditLog.service.ts` — never
 * written to directly from a controller.
 *
 * Deliberately **never stores passwords, tokens, or secrets** — `metadata`
 * is a small, explicitly-built plain object per call site (e.g.
 * `{ previousStatus, newStatus }`), never a raw request body dump, so there
 * is no way for a future caller to accidentally log a credential.
 */
export interface IAuditLog {
  /** The admin-staff user who performed the action. Denormalizes
   * `actorEmail`/`actorRole` at write time (not just a `ref`) so this log
   * stays a faithful historical record even if the actor's role/email later
   * changes or their account is deleted — exactly the same "audit log
   * outlives the thing it describes" reasoning as `docs/Database.md`'s
   * denormalization principle (§1.3). */
  actorId: Types.ObjectId
  actorEmail: string
  actorRole: Role
  /** A short, stable machine-readable verb, e.g. `user.status.update`,
   * `user.role.update` — namespaced `entity.field.verb` so a future filter
   * UI can group by entity type without parsing free text. */
  action: string
  entityType: string
  /** Stored as a string (not `Types.ObjectId`) since an entity can be any
   * collection's document, not just one `ref`-able model. */
  entityId: string
  /** Small, explicitly-shaped, JSON-safe context (e.g. previous/new value) —
   * never a full document dump, per this model's own "no secrets" rule. */
  metadata: Record<string, unknown>
  createdAt?: Date
}

export type AuditLogDocument = HydratedDocument<IAuditLog>

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorEmail: { type: String, required: true, trim: true },
    actorRole: { type: String, enum: ROLES, required: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  // No `updatedAt` — an audit log entry is immutable by design, but
  // `timestamps: true` is the simplest way to get a reliable `createdAt`
  // without hand-rolling it; `updatedAt` is simply never read or relied on.
  { timestamps: true },
)

auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ actorId: 1, createdAt: -1 })
auditLogSchema.index({ entityType: 1, entityId: 1 })

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema)
