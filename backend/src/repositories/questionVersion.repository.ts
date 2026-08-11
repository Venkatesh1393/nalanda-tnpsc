import type { Types } from 'mongoose'

import {
  QuestionVersion,
  type IQuestionVersionSnapshot,
  type QuestionVersionChangeType,
  type QuestionVersionDocument,
} from '../models/QuestionVersion.model'

export interface CreateVersionInput {
  questionId: Types.ObjectId | string
  snapshot: IQuestionVersionSnapshot
  changeType: QuestionVersionChangeType
  changedBy: Types.ObjectId | string
  changedByEmail: string
  changeNote?: string
}

/** The next `versionNumber` for a question is simply "however many versions
 * already exist, plus one" — versions are never deleted, so this stays a
 * cheap, race-safe-enough count for an admin-driven (low-concurrency)
 * write path; the unique `{questionId, versionNumber}` index is the real
 * backstop against a genuine race. */
async function nextVersionNumber(questionId: Types.ObjectId | string): Promise<number> {
  const count = await QuestionVersion.countDocuments({ questionId })
  return count + 1
}

export async function createVersion(
  input: CreateVersionInput,
): Promise<QuestionVersionDocument> {
  const versionNumber = await nextVersionNumber(input.questionId)
  return QuestionVersion.create({
    questionId: input.questionId,
    versionNumber,
    snapshot: input.snapshot,
    changeType: input.changeType,
    changedBy: input.changedBy,
    changedByEmail: input.changedByEmail,
    changeNote: input.changeNote,
  })
}

export function listByQuestion(
  questionId: Types.ObjectId | string,
): Promise<QuestionVersionDocument[]> {
  return QuestionVersion.find({ questionId }).sort({ versionNumber: -1 })
}

export function findByQuestionAndVersion(
  questionId: Types.ObjectId | string,
  versionNumber: number,
): Promise<QuestionVersionDocument | null> {
  return QuestionVersion.findOne({ questionId, versionNumber })
}

export function findLatest(
  questionId: Types.ObjectId | string,
): Promise<QuestionVersionDocument | null> {
  return QuestionVersion.findOne({ questionId }).sort({ versionNumber: -1 })
}
