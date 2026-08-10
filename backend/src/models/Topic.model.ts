import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { bilingualField, type BilingualText } from './shared/bilingualText'
import { softDeletePlugin, type SoftDeletable } from './shared/softDelete.plugin'

export interface ITopic extends SoftDeletable {
  slug: string
  subjectId: Types.ObjectId
  /** Denormalized from `subjectId.examIds` (docs/Database.md §8's "avoid a
   * join chain" rationale) — usually mirrors the parent Subject, but kept
   * independently settable in case a Topic doesn't apply to every exam its
   * Subject does. */
  examIds: Types.ObjectId[]
  name: BilingualText
  order: number
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export type TopicDocument = HydratedDocument<ITopic>

const topicSchema = new Schema<ITopic>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    examIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length > 0,
        message: 'A Topic must apply to at least one exam.',
      },
    },
    name: bilingualField({ required: true }),
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

topicSchema.plugin(softDeletePlugin)
topicSchema.index({ subjectId: 1, order: 1 })
topicSchema.index({ examIds: 1 })
// Backs Global Search's `$text` relevance-ranked query (Sprint 4 Step 63).
topicSchema.index({ 'name.en': 'text', 'name.ta': 'text' })

export const Topic = model<ITopic>('Topic', topicSchema)
