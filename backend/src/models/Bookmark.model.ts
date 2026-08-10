import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { BOOKMARK_CONTENT_TYPES, type BookmarkContentType } from '../constants/bookmarks'

/** Polymorphic reference (docs/Database.md §4.4) — `contentId` resolves
 * against whichever collection `contentType` names; there is no Mongoose
 * `ref` on `contentId` itself since it isn't a single fixed collection. */
export interface IBookmark {
  userId: Types.ObjectId
  contentType: BookmarkContentType
  contentId: Types.ObjectId
  note?: string
  /** Populated by Mongoose's `timestamps: { createdAt: true }` below —
   * declared here only so TypeScript knows it exists on a hydrated
   * document (same pattern as `User.model.ts`'s `createdAt`). */
  createdAt: Date
}

export type BookmarkDocument = HydratedDocument<IBookmark>

const bookmarkSchema = new Schema<IBookmark>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contentType: { type: String, enum: BOOKMARK_CONTENT_TYPES, required: true },
    contentId: { type: Schema.Types.ObjectId, required: true },
    note: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// Prevents duplicate bookmarks of the same content (API.md's ALREADY_BOOKMARKED).
bookmarkSchema.index({ userId: 1, contentType: 1, contentId: 1 }, { unique: true })

export const Bookmark = model<IBookmark>('Bookmark', bookmarkSchema)
