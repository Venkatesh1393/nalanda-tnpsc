import { Schema, type Types } from 'mongoose'

/**
 * Sprint 4 Step 71.5 — Enterprise Content Management Pipeline. A reusable
 * Mongoose plugin (same shape as the neighboring `softDelete.plugin.ts`)
 * adding a governed Draft → Pending Review → Approved → Published lifecycle
 * to a content model. Only `Question.model.ts` attaches this today — every
 * other content type (Exam/Subject/Topic/.../LiveExam) shares the same
 * repository→service→controller→route layering and could adopt it later
 * without copy-pasting this schema, but wiring the workflow through
 * services/routes for those types is explicitly out of this step's scope.
 *
 * Deliberately only 4 stored statuses — the task's fifth lifecycle stage,
 * "Archived," is **not** a new value here. It's the existing
 * `softDeletePlugin`'s `deletedAt` mechanism (Step 53), already built,
 * already audited, already has admin UI — adding a second, parallel
 * "archived" concept next to it would just be two names for the same idea.
 *
 * `submittedBy/reviewedBy/publishedBy/lastEditedBy` are denormalized here
 * for fast admin-UI reads (who submitted/approved/published this, right on
 * the document); `AuditLog` remains the authoritative, queryable historical
 * record of every transition — this is the same "denormalize for reads,
 * AuditLog for history" split already used everywhere else in this codebase.
 */
export const CONTENT_WORKFLOW_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'published',
] as const
export type ContentWorkflowStatus = (typeof CONTENT_WORKFLOW_STATUSES)[number]

export interface IContentWorkflow {
  status: ContentWorkflowStatus
  submittedBy?: Types.ObjectId
  submittedAt?: Date
  /** Set by either an approval or a request-changes action — whichever
   * happened most recently at the review gate. */
  reviewedBy?: Types.ObjectId
  reviewedAt?: Date
  /** Only meaningful after a request-changes action; cleared on the next
   * submission so a stale reason never lingers on a resubmitted draft. */
  reviewNote?: string
  publishedBy?: Types.ObjectId
  publishedAt?: Date
  lastEditedBy?: Types.ObjectId
  lastEditedAt?: Date
}

export interface WorkflowGoverned {
  workflow: IContentWorkflow
}

export function contentWorkflowPlugin(schema: Schema): void {
  schema.add({
    workflow: {
      status: {
        type: String,
        enum: CONTENT_WORKFLOW_STATUSES,
        default: 'draft',
        required: true,
      },
      submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      submittedAt: { type: Date },
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date },
      reviewNote: { type: String, trim: true, maxlength: 1000 },
      publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      publishedAt: { type: Date },
      lastEditedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      lastEditedAt: { type: Date },
    },
  })
  schema.index({ 'workflow.status': 1 })
}
