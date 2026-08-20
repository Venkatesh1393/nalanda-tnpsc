import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { TNPSC_EXAM_STAGES, type TnpscExamStage } from '../constants/practice'
import { bilingualField, type BilingualText } from './shared/bilingualText'
import { softDeletePlugin, type SoftDeletable } from './shared/softDelete.plugin'

/**
 * A real, downloadable PDF of a previous year's TNPSC exam paper — distinct
 * from `Question.isPreviousYear`/`pyqYear` (per-question tags on the
 * syllabus question bank, used by Practice's PYQ mode). This is a standalone
 * document, uploaded once by an admin and downloaded as-is by students,
 * gated by `services/questionPaper.service.ts`'s free-limit/purchase check
 * rather than any subscription tier — see `constants/questionPapers.ts`.
 *
 * No `contentWorkflow` plugin — that draft/review/publish pipeline is
 * `Question`-only by explicit design (`shared/contentWorkflow.plugin.ts`'s
 * header comment); a plain uploaded document just needs the same
 * `isActive` on/off switch every other content model already uses.
 */
export interface IQuestionPaper extends SoftDeletable {
  examId: Types.ObjectId
  year: number
  title: BilingualText
  tnpscExamType?: TnpscExamStage
  fileUrl?: string
  /** Cloudinary public ID for `fileUrl` — required to delete/replace the
   * asset safely; undefined until a file has been uploaded (Sprint 4 Step
   * 53's two-step "create the record, then upload the file" convention,
   * matching `StudyMaterial`/`Question` bulk-import image attachment). */
  filePublicId?: string
  fileBytes?: number
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export type QuestionPaperDocument = HydratedDocument<IQuestionPaper>

const CURRENT_YEAR = new Date().getFullYear()

const questionPaperSchema = new Schema<IQuestionPaper>(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    year: { type: Number, required: true, min: 1990, max: CURRENT_YEAR + 1 },
    title: bilingualField({ required: true }),
    tnpscExamType: { type: String, enum: TNPSC_EXAM_STAGES },
    fileUrl: { type: String, trim: true },
    filePublicId: { type: String, trim: true },
    fileBytes: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

questionPaperSchema.plugin(softDeletePlugin)
questionPaperSchema.index({ examId: 1, year: -1 })
questionPaperSchema.index({ isActive: 1 })

export const QuestionPaper = model<IQuestionPaper>('QuestionPaper', questionPaperSchema)
