import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

/**
 * Records *that* a student has free-accessed a given previous-year question
 * paper — the persisted ledger `services/questionPaper.service.ts`'s
 * first-5-papers-free rule reads from. One document per (user, paper); the
 * unique index both prevents a duplicate document and is the idempotency
 * check that lets re-downloading an already-free-accessed paper skip the
 * free-slot count entirely, mirroring `CurrentAffairRead`'s
 * `{userId, currentAffairId}` duplicate-prevention pattern exactly.
 */
export interface IQuestionPaperAccess {
  userId: Types.ObjectId
  paperId: Types.ObjectId
  createdAt: Date
}

export type QuestionPaperAccessDocument = HydratedDocument<IQuestionPaperAccess>

const questionPaperAccessSchema = new Schema<IQuestionPaperAccess>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paperId: { type: Schema.Types.ObjectId, ref: 'QuestionPaper', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

questionPaperAccessSchema.index({ userId: 1, paperId: 1 }, { unique: true })

export const QuestionPaperAccess = model<IQuestionPaperAccess>(
  'QuestionPaperAccess',
  questionPaperAccessSchema,
)
