import type { Types } from 'mongoose'

import {
  AiQuestionDraft,
  type AiQuestionDraftDocument,
  type AiQuestionDraftStatus,
  type IAiQuestionDraft,
} from '../models/AiQuestionDraft.model'

export function createMany(
  drafts: Partial<IAiQuestionDraft>[],
): Promise<AiQuestionDraftDocument[]> {
  // Mongoose's `insertMany` (unlike the raw MongoDB driver) validates every
  // document against the schema by default — the same options/bilingual
  // invariants a single `.create()` would enforce still apply per-draft.
  // Cast needed because `insertMany`'s input type is `Partial<IAiQuestionDraft>`
  // (every field optional) but its resolved documents are fully-populated —
  // TS can't see that the schema's own `required` validators guarantee it.
  return AiQuestionDraft.insertMany(drafts) as Promise<AiQuestionDraftDocument[]>
}

export function findByIdForAdmin(
  id: Types.ObjectId | string,
): Promise<AiQuestionDraftDocument | null> {
  return AiQuestionDraft.findById(id)
}

export interface AdminDraftListFilter {
  status?: AiQuestionDraftStatus
  subjectId?: Types.ObjectId | string
  topicId?: Types.ObjectId | string
  batchId?: string
}

export async function listForAdmin(
  filter: AdminDraftListFilter,
  page: number,
  limit: number,
): Promise<{ items: AiQuestionDraftDocument[]; total: number }> {
  const query: Record<string, unknown> = {}
  if (filter.status) query.status = filter.status
  if (filter.subjectId) query.subjectId = filter.subjectId
  if (filter.topicId) query.topicId = filter.topicId
  if (filter.batchId) query['generation.batchId'] = filter.batchId

  const [items, total] = await Promise.all([
    AiQuestionDraft.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AiQuestionDraft.countDocuments(query),
  ])
  return { items, total }
}

export function markApproved(
  id: Types.ObjectId | string,
  reviewedBy: Types.ObjectId | string,
  publishedQuestionId: Types.ObjectId | string,
): Promise<AiQuestionDraftDocument | null> {
  return AiQuestionDraft.findByIdAndUpdate(
    id,
    {
      $set: {
        status: 'approved',
        reviewedBy,
        reviewedAt: new Date(),
        publishedQuestionId,
      },
    },
    { new: true },
  )
}

export function markRejected(
  id: Types.ObjectId | string,
  reviewedBy: Types.ObjectId | string,
  rejectionReason?: string,
): Promise<AiQuestionDraftDocument | null> {
  return AiQuestionDraft.findByIdAndUpdate(
    id,
    {
      $set: {
        status: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
        ...(rejectionReason && { rejectionReason }),
      },
    },
    { new: true },
  )
}

/** Content-only edits (wording/options/explanation/difficulty/tags) — the
 * service layer only calls this while `status === 'pending'`; a draft's
 * subject/topic/subtopic/exam chain is never editable here (re-categorizing
 * would need the same reference validation a new draft goes through, which
 * this step doesn't ask for). */
export async function updateContent(
  id: Types.ObjectId | string,
  data: Partial<IAiQuestionDraft>,
): Promise<AiQuestionDraftDocument | null> {
  const draft = await AiQuestionDraft.findById(id)
  if (!draft) return null
  Object.assign(draft, data)
  await draft.save()
  return draft
}
