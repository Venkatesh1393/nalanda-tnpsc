import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { bilingualField, type BilingualText } from './shared/bilingualText'
import { softDeletePlugin, type SoftDeletable } from './shared/softDelete.plugin'

export interface ISubject extends SoftDeletable {
  slug: string
  name: BilingualText
  examIds: Types.ObjectId[]
  order: number
  icon?: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export type SubjectDocument = HydratedDocument<ISubject>

const subjectSchema = new Schema<ISubject>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: bilingualField({ required: true }),
    examIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length > 0,
        message: 'A Subject must apply to at least one exam.',
      },
    },
    order: { type: Number, default: 0 },
    icon: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

subjectSchema.plugin(softDeletePlugin)
subjectSchema.index({ examIds: 1, order: 1 })
// Backs Global Search's `$text` relevance-ranked query (Sprint 4 Step 63) —
// distinct from the plain-regex `search()` below, which Learn's own search
// bar still uses.
subjectSchema.index({ 'name.en': 'text', 'name.ta': 'text' })

export const Subject = model<ISubject>('Subject', subjectSchema)
