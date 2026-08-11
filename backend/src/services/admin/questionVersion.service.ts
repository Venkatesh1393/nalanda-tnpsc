import type { QuestionVersionDocument } from '../../models/QuestionVersion.model'
import * as questionRepository from '../../repositories/question.repository'
import * as questionVersionRepository from '../../repositories/questionVersion.repository'
import { ApiError } from '../../utils/ApiError'
import * as auditLogService from '../auditLog.service'
import {
  recordVersion,
  resolveAuditActor,
  toDTO,
  type ActingAdmin,
  type AdminQuestionDTO,
} from './adminQuestions.service'

export interface QuestionVersionDTO {
  versionNumber: number
  snapshot: QuestionVersionDocument['snapshot']
  changeType: QuestionVersionDocument['changeType']
  changedBy: string
  changedByEmail: string
  changeNote?: string
  createdAt: Date | null
}

function toVersionDTO(version: QuestionVersionDocument): QuestionVersionDTO {
  return {
    versionNumber: version.versionNumber,
    snapshot: version.snapshot,
    changeType: version.changeType,
    changedBy: version.changedBy.toString(),
    changedByEmail: version.changedByEmail,
    changeNote: version.changeNote,
    createdAt: version.createdAt ?? null,
  }
}

export async function listVersions(questionId: string): Promise<QuestionVersionDTO[]> {
  const question = await questionRepository.findByIdForAdmin(questionId)
  if (!question) throw ApiError.notFound('Question not found')
  const versions = await questionVersionRepository.listByQuestion(questionId)
  return versions.map(toVersionDTO)
}

export async function getVersion(
  questionId: string,
  versionNumber: number,
): Promise<QuestionVersionDTO> {
  const version = await questionVersionRepository.findByQuestionAndVersion(
    questionId,
    versionNumber,
  )
  if (!version) throw ApiError.notFound('Version not found')
  return toVersionDTO(version)
}

/**
 * Restores a question's content fields to a prior version's snapshot —
 * applied through the same `questionRepository.updateById` path a normal
 * edit uses, so every content validator (options invariants, pyqYear
 * requirement, etc.) re-runs exactly as it would for a hand-typed edit.
 * History stays append-only: this *creates* a new version row
 * (`changeType: 'rollback'`) documenting what happened rather than deleting
 * anything newer than the target — the same "never destroy history"
 * instinct as `AiQuestionDraft`'s kept-not-deleted rejected drafts.
 */
export async function rollback(
  actor: ActingAdmin,
  questionId: string,
  versionNumber: number,
): Promise<AdminQuestionDTO> {
  const question = await questionRepository.findByIdForAdmin(questionId)
  if (!question) throw ApiError.notFound('Question not found')

  const targetVersion = await questionVersionRepository.findByQuestionAndVersion(
    questionId,
    versionNumber,
  )
  if (!targetVersion) throw ApiError.notFound('Version not found')

  // `.toObject()` on the *parent* document — `targetVersion.snapshot` on
  // its own is a live Mongoose subdocument instance, not a plain object;
  // passing it directly into another document's `Object.assign`
  // (`questionRepository.updateById`) risks Mongoose's internal document
  // machinery (getters/internal state) leaking through in ways a plain data
  // object never would. Converting first is the safe, idiomatic way to
  // reuse a persisted subdocument as plain input.
  const restored = await questionRepository.updateById(
    questionId,
    targetVersion.toObject().snapshot,
  )
  if (!restored) throw ApiError.notFound('Question not found')

  const auditActor = await resolveAuditActor(actor)
  await recordVersion(
    restored,
    'rollback',
    auditActor,
    `Rolled back to version ${versionNumber}`,
  )
  await auditLogService.recordAction(
    auditActor,
    'question.rollback',
    'Question',
    questionId,
    {
      rolledBackToVersion: versionNumber,
    },
  )

  return toDTO(restored)
}
