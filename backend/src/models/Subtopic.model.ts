import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { bilingualField, type BilingualText } from './shared/bilingualText'
import { softDeletePlugin, type SoftDeletable } from './shared/softDelete.plugin'

export interface ISubtopic extends SoftDeletable {
  slug: string
  topicId: Types.ObjectId
  subjectId: Types.ObjectId // denormalized — avoids a Topic hop for subject-scoped rollups
  examIds: Types.ObjectId[] // denormalized, see Topic.model.ts
  name: BilingualText
  order: number
  estimatedMinutes?: number
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export type SubtopicDocument = HydratedDocument<ISubtopic>

const subtopicSchema = new Schema<ISubtopic>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    examIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length > 0,
        message: 'A Subtopic must apply to at least one exam.',
      },
    },
    name: bilingualField({ required: true }),
    order: { type: Number, default: 0 },
    estimatedMinutes: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

subtopicSchema.plugin(softDeletePlugin)
subtopicSchema.index({ topicId: 1, order: 1 })
subtopicSchema.index({ subjectId: 1 })

export const Subtopic = model<ISubtopic>('Subtopic', subtopicSchema)
