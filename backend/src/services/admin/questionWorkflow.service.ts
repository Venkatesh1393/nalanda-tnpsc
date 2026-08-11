import type { Types } from 'mongoose'

import * as questionRepository from '../../repositories/question.repository'
import { ApiError } from '../../utils/ApiError'
import * as auditLogService from '../auditLog.service'
import {
  resolveAuditActor,
  toDTO,
  type ActingAdmin,
  type AdminQuestionDTO,
} from './adminQuestions.service'

/**
 * Sprint 4 Step 71.5 — the Draft -> Pending Review -> Approved -> Published
 * approval chain (`docs/`-referenced task diagram: Content Editor ->
 * Reviewer -> Admin Approval -> Published). Maps onto the *existing* role
 * set with no new roles added (`routes/admin/questions.routes.ts` gates
 * each function below by role):
 *   - Content Editor stage -> `content_editor`/`admin`/`super_admin`
 *   - Reviewer stage       -> `moderator`/`admin`/`super_admin` (moderator
 *     previously had read-only access to Questions; this is its first real
 *     write path, deliberately narrow — review/gate only, never edit)
 *   - Admin Approval stage -> `admin`/`super_admin` only
 *
 * No self-approval blocking, no distinct-person enforcement — confirmed
 * with the user as a deliberate two-stage (submit -> approve, then a
 * separate publish) simplification of the task's literal three-arrow
 * diagram, mirroring the existing `AiQuestionDraft` single-reviewer
 * precedent (Step 65) rather than building sequential-chain tracking.
 */

function requireStatus(current: string, expected: string, actionLabel: string): void {
  if (current !== expected) {
    throw ApiError.badRequest(
      `${actionLabel} requires the question to be "${expected}" (current status: "${current}").`,
    )
  }
}

export async function submitForReview(
  actor: ActingAdmin,
  id: string,
): Promise<AdminQuestionDTO> {
  const existing = await questionRepository.findByIdForAdmin(id)
  if (!existing) throw ApiError.notFound('Question not found')
  requireStatus(existing.workflow.status, 'draft', 'Submitting for review')

  const updated = await questionRepository.updateWorkflow(id, {
    status: 'pending_review',
    submittedBy: actor.id as unknown as Types.ObjectId,
    submittedAt: new Date(),
    reviewNote: null,
  })
  if (!updated) throw ApiError.notFound('Question not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'question.submitForReview',
    'Question',
    id,
  )
  return toDTO(updated)
}

export async function approveQuestion(
  actor: ActingAdmin,
  id: string,
): Promise<AdminQuestionDTO> {
  const existing = await questionRepository.findByIdForAdmin(id)
  if (!existing) throw ApiError.notFound('Question not found')
  requireStatus(existing.workflow.status, 'pending_review', 'Approving')

  const updated = await questionRepository.updateWorkflow(id, {
    status: 'approved',
    reviewedBy: actor.id as unknown as Types.ObjectId,
    reviewedAt: new Date(),
    reviewNote: null,
  })
  if (!updated) throw ApiError.notFound('Question not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'question.approve', 'Question', id)
  return toDTO(updated)
}

export async function requestChanges(
  actor: ActingAdmin,
  id: string,
  reason: string,
): Promise<AdminQuestionDTO> {
  const existing = await questionRepository.findByIdForAdmin(id)
  if (!existing) throw ApiError.notFound('Question not found')
  requireStatus(existing.workflow.status, 'pending_review', 'Requesting changes')

  const updated = await questionRepository.updateWorkflow(id, {
    status: 'draft',
    reviewedBy: actor.id as unknown as Types.ObjectId,
    reviewedAt: new Date(),
    reviewNote: reason,
  })
  if (!updated) throw ApiError.notFound('Question not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'question.requestChanges',
    'Question',
    id,
    { reason },
  )
  return toDTO(updated)
}

export async function publishQuestion(
  actor: ActingAdmin,
  id: string,
): Promise<AdminQuestionDTO> {
  const existing = await questionRepository.findByIdForAdmin(id)
  if (!existing) throw ApiError.notFound('Question not found')
  requireStatus(existing.workflow.status, 'approved', 'Publishing')

  const updated = await questionRepository.updateWorkflow(id, {
    status: 'published',
    publishedBy: actor.id as unknown as Types.ObjectId,
    publishedAt: new Date(),
  })
  if (!updated) throw ApiError.notFound('Question not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(auditActor, 'question.publish', 'Question', id)
  return toDTO(updated)
}
