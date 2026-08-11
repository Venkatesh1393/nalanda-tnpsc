import * as questionRepository from '../../repositories/question.repository'
import type { BulkUpdatePatch } from '../../repositories/question.repository'
import { ApiError } from '../../utils/ApiError'
import * as auditLogService from '../auditLog.service'
import {
  recordVersion,
  resolveAuditActor,
  type ActingAdmin,
} from './adminQuestions.service'

/**
 * Sprint 4 Step 71.5 — "Bulk Update"/"Bulk Delete"/"Preview before Import"
 * applied to the Question bank at scale. `patch` is intentionally limited
 * to a safe field allowlist (`BulkUpdatePatch` — isActive/isPremium/
 * difficulty/tags/aiExplanationEligible) rather than arbitrary free-form
 * fields: changing hierarchy references (subject/topic/subtopic/exam) or
 * content text in bulk would need the same per-document reference/invariant
 * revalidation `questionImport.service.ts`'s row-by-row parser already does
 * for a single file — that doesn't safely generalize to an arbitrary bulk
 * PATCH, so it stays out of scope here (single-question edit and the
 * file-import path remain the only ways to change those fields).
 */

export interface BulkUpdatePreviewResult {
  matchedCount: number
  sample: { id: string; questionTextEn: string }[]
}

export async function bulkUpdatePreview(
  questionIds: string[],
): Promise<BulkUpdatePreviewResult> {
  const questions = await questionRepository.findByIdsForAdmin(questionIds)
  return {
    matchedCount: questions.length,
    sample: questions.slice(0, 5).map((question) => ({
      id: question.id,
      questionTextEn: question.questionText.en ?? '',
    })),
  }
}

export interface BulkUpdateResult {
  matchedCount: number
  modifiedCount: number
}

export async function bulkUpdate(
  actor: ActingAdmin,
  questionIds: string[],
  patch: BulkUpdatePatch,
): Promise<BulkUpdateResult> {
  if (Object.keys(patch).length === 0) {
    throw ApiError.badRequest('At least one field must be given to update.')
  }

  const { matchedCount, modifiedCount } = await questionRepository.bulkUpdateFields(
    questionIds,
    patch,
  )

  // One version snapshot per affected question — still cheap at this
  // field-set (no per-document Mongoose validation needed, `bulkUpdateFields`
  // already used the fast `updateMany` path), and keeps "every edit
  // maintains version history" true for bulk edits too, not just
  // one-at-a-time ones.
  const auditActor = await resolveAuditActor(actor)
  const updatedQuestions = await questionRepository.findByIdsForAdmin(questionIds)
  await Promise.all(
    updatedQuestions.map((question) =>
      recordVersion(
        question,
        'bulkUpdate',
        auditActor,
        `Bulk update: ${Object.keys(patch).join(', ')}`,
      ),
    ),
  )

  await auditLogService.recordAction(
    auditActor,
    'question.bulkUpdate',
    'Question',
    'batch',
    {
      requestedCount: questionIds.length,
      matchedCount,
      modifiedCount,
      fields: Object.keys(patch),
    },
  )

  return { matchedCount, modifiedCount }
}

export interface BulkDeleteResult {
  matchedCount: number
  modifiedCount: number
}

export async function bulkDelete(
  actor: ActingAdmin,
  questionIds: string[],
): Promise<BulkDeleteResult> {
  const { matchedCount, modifiedCount } =
    await questionRepository.bulkArchive(questionIds)

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'question.bulkDelete',
    'Question',
    'batch',
    {
      requestedCount: questionIds.length,
      matchedCount,
      modifiedCount,
    },
  )

  return { matchedCount, modifiedCount }
}
