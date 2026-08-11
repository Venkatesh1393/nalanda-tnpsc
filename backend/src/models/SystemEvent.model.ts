import { type HydratedDocument, model, Schema } from 'mongoose'

/**
 * Sprint 4 Step 74 — Production Monitoring. Self-hosted operational-events
 * log — the queryable counterpart to `docs/MonitoringStrategy.md` §3's
 * disclosed gap ("no dedicated error-tracking service integrated"). Rather
 * than a separate narrow collection per signal (an `ErrorLog`, a
 * `SlowQueryLog`, a `WebhookFailureLog`, ...), one small typed `type` enum
 * keeps this the same "one flexible collection, not model sprawl" shape
 * `AuditLog.model.ts` already established for admin actions — everything
 * here is infra/ops noise, not a long-term audit trail, hence the shorter
 * TTL (§ below) `AuditLog` deliberately doesn't have.
 *
 * Written via `utils/systemEvents.ts#recordSystemEvent` from four call
 * sites: `middleware/errorHandler.middleware.ts` (unexpected errors),
 * `middleware/requestMonitoring.middleware.ts` (slow API requests),
 * `config/database.ts` (slow MongoDB queries, via MongoClient command
 * monitoring), and `services/payment.service.ts` (Razorpay webhook
 * signature/parse failures) — never written to directly from a controller.
 *
 * **Never stores secrets, tokens, request bodies, or full stack traces** —
 * `message` is a short human-readable summary, `metadata` is a small,
 * explicitly-built plain object per call site (same discipline
 * `AuditLog.model.ts` already applies), matching this step's "never expose
 * secrets" requirement. The full error/stack still goes to `logs/error.log`
 * via Winston (`config/logger.ts`) as before — this collection is an
 * additional, *queryable* summary layer, not a replacement for it.
 */
export const SYSTEM_EVENT_TYPES = [
  'error',
  'slow_query',
  'slow_request',
  'webhook_failure',
] as const
export type SystemEventType = (typeof SYSTEM_EVENT_TYPES)[number]

export const SYSTEM_EVENT_SEVERITIES = ['warning', 'error', 'critical'] as const
export type SystemEventSeverity = (typeof SYSTEM_EVENT_SEVERITIES)[number]

/** Ops noise, not a permanent record — 30 days is enough to spot a trend or
 * investigate a recent incident without the collection growing unbounded. */
const RETENTION_DAYS = 30

export interface ISystemEvent {
  type: SystemEventType
  severity: SystemEventSeverity
  /** Short, human-readable, safe-to-display summary — e.g. "Slow query on
   * questions.find (842ms)", never a raw error message that might echo
   * user input or a connection string. */
  message: string
  /** Where this originated — a route path, a Mongoose collection name, a
   * webhook event type — for grouping/filtering, not a stack trace. */
  source: string
  /** Small, explicitly-shaped, JSON-safe context (status code, duration,
   * collection name, event type) — same "no secrets" discipline as
   * `AuditLog.model.ts`'s `metadata`. */
  metadata?: Record<string, unknown>
  createdAt?: Date
}

export type SystemEventDocument = HydratedDocument<ISystemEvent>

const systemEventSchema = new Schema<ISystemEvent>(
  {
    type: { type: String, enum: SYSTEM_EVENT_TYPES, required: true },
    severity: { type: String, enum: SYSTEM_EVENT_SEVERITIES, required: true },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    source: { type: String, required: true, trim: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

systemEventSchema.index({ type: 1, createdAt: -1 })
systemEventSchema.index({ severity: 1, createdAt: -1 })
systemEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: RETENTION_DAYS * 86_400 },
)

export const SystemEvent = model<ISystemEvent>('SystemEvent', systemEventSchema)
