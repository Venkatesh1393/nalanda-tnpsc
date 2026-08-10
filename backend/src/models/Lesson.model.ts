import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { bilingualField, type BilingualText } from './shared/bilingualText'
import { softDeletePlugin, type SoftDeletable } from './shared/softDelete.plugin'

export const LESSON_TYPES = ['video', 'reading', 'mixed'] as const
export type LessonType = (typeof LESSON_TYPES)[number]

/**
 * The video-bearing teachable unit under a Subtopic — merges
 * `docs/Database.md` §4.2's separate `Videos` collection into `Lesson`,
 * since this step's requested model list names `Lesson` + `StudyMaterial`
 * but not `Video`. `StudyMaterial` remains the notes/PDF sibling.
 */
export interface ILesson extends SoftDeletable {
  subtopicId: Types.ObjectId
  title: BilingualText
  type: LessonType
  order: number
  video?: {
    cloudinaryAssetId?: string
    durationSeconds?: number
    thumbnailUrl?: string
  }
  transcript?: BilingualText
  isPremium: boolean
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export type LessonDocument = HydratedDocument<ILesson>

const lessonSchema = new Schema<ILesson>(
  {
    subtopicId: { type: Schema.Types.ObjectId, ref: 'Subtopic', required: true },
    title: bilingualField({ required: true }),
    type: { type: String, enum: LESSON_TYPES, default: 'video' },
    order: { type: Number, default: 0 },
    video: {
      cloudinaryAssetId: { type: String, trim: true },
      durationSeconds: { type: Number, min: 0 },
      thumbnailUrl: { type: String, trim: true },
    },
    transcript: bilingualField({ requireAtLeastOne: false }),
    isPremium: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

lessonSchema.plugin(softDeletePlugin)
lessonSchema.index({ subtopicId: 1, order: 1 })
// Backs Global Search's `$text` relevance-ranked query (Sprint 4 Step 63).
lessonSchema.index({ 'title.en': 'text', 'title.ta': 'text' })

export const Lesson = model<ILesson>('Lesson', lessonSchema)
