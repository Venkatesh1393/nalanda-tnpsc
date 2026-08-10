import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import {
  bilingualField,
  bilingualParagraphsField,
  type BilingualParagraphs,
  type BilingualText,
} from './shared/bilingualText'
import { softDeletePlugin, type SoftDeletable } from './shared/softDelete.plugin'

export const STUDY_MATERIAL_TYPES = ['notes', 'pdf', 'reference'] as const
export type StudyMaterialType = (typeof STUDY_MATERIAL_TYPES)[number]

export const STUDY_MATERIAL_FILE_RESOURCE_TYPES = ['image', 'raw'] as const
export type StudyMaterialFileResourceType =
  (typeof STUDY_MATERIAL_FILE_RESOURCE_TYPES)[number]

export interface IStudyMaterial extends SoftDeletable {
  subtopicId: Types.ObjectId
  title: BilingualText
  body: BilingualParagraphs
  fileUrl?: string
  /** Cloudinary public ID for `fileUrl` — required to delete/replace the
   * asset safely; undefined for study materials with no uploaded file. */
  filePublicId?: string
  /** `'raw'` for PDFs, `'image'` for scanned-page/reference images — decides
   * which Cloudinary API to call on delete/replace (docs/Database.md: never
   * store binaries in Mongo, this is just enough metadata to manage the
   * Cloudinary asset). */
  fileResourceType?: StudyMaterialFileResourceType
  fileFormat?: string
  fileBytes?: number
  type: StudyMaterialType
  isPremium: boolean
  version: number
  authorId?: Types.ObjectId
  publishedAt?: Date
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export type StudyMaterialDocument = HydratedDocument<IStudyMaterial>

const studyMaterialSchema = new Schema<IStudyMaterial>(
  {
    subtopicId: { type: Schema.Types.ObjectId, ref: 'Subtopic', required: true },
    title: bilingualField({ required: true }),
    body: bilingualParagraphsField(),
    fileUrl: { type: String, trim: true },
    filePublicId: { type: String, trim: true },
    fileResourceType: { type: String, enum: STUDY_MATERIAL_FILE_RESOURCE_TYPES },
    fileFormat: { type: String, trim: true },
    fileBytes: { type: Number, min: 0 },
    type: { type: String, enum: STUDY_MATERIAL_TYPES, default: 'notes' },
    isPremium: { type: Boolean, default: false },
    version: { type: Number, default: 1, min: 1 },
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

studyMaterialSchema.plugin(softDeletePlugin)
studyMaterialSchema.index({ subtopicId: 1, type: 1 })

export const StudyMaterial = model<IStudyMaterial>('StudyMaterial', studyMaterialSchema)
