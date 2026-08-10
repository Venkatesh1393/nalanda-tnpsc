import { type HydratedDocument, model, Schema } from 'mongoose'

import { EXAM_CATEGORY_CODES, type ExamCategoryCode } from '../constants/exam'
import { bilingualField, type BilingualText } from './shared/bilingualText'

/**
 * A first-class collection rather than a bare enum — a deliberate upgrade
 * from `docs/Database.md` §4.1, which models exam category as a plain
 * string enum denormalized onto Subjects/Topics/Questions. This step's
 * build instruction asked for a standalone `Exam` model explicitly, which
 * gives exam metadata (bilingual name, description, icon, ordering,
 * activation) somewhere real to live instead of only in a frontend
 * constant. `code` stays a closed enum (`EXAM_CATEGORY_CODES`, identical to
 * `frontend/src/constants/exam.ts`) since the 8 TNPSC categories are fixed
 * for the foreseeable product scope — the collection buys admin-editable
 * metadata, not open-ended taxonomy growth.
 */
export interface IExam {
  code: ExamCategoryCode
  name: BilingualText
  description?: BilingualText
  icon?: string
  order: number
  isActive: boolean
  /** Populated by Mongoose's `timestamps: true` below — declared here only
   * so TypeScript knows they exist on a hydrated document (Step 54's admin
   * Exam list/detail). */
  createdAt?: Date
  updatedAt?: Date
}

export type ExamDocument = HydratedDocument<IExam>

const examSchema = new Schema<IExam>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      enum: EXAM_CATEGORY_CODES,
    },
    name: bilingualField({ required: true }),
    description: bilingualField({ requireAtLeastOne: false }),
    icon: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

examSchema.index({ isActive: 1, order: 1 })

export const Exam = model<IExam>('Exam', examSchema)
