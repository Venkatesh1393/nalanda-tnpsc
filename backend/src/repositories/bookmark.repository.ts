import type { Types } from 'mongoose'

import type { BookmarkContentType } from '../constants/bookmarks'
import { Bookmark, type BookmarkDocument } from '../models/Bookmark.model'

export function findOne(
  userId: Types.ObjectId | string,
  contentType: BookmarkContentType,
  contentId: Types.ObjectId | string,
): Promise<BookmarkDocument | null> {
  return Bookmark.findOne({ userId, contentType, contentId })
}

export function findById(
  bookmarkId: Types.ObjectId | string,
): Promise<BookmarkDocument | null> {
  return Bookmark.findById(bookmarkId)
}

export function findByUser(
  userId: Types.ObjectId | string,
  contentType?: BookmarkContentType,
): Promise<BookmarkDocument[]> {
  return Bookmark.find({ userId, ...(contentType && { contentType }) }).sort({
    createdAt: -1,
  })
}

export function create(
  userId: Types.ObjectId | string,
  contentType: BookmarkContentType,
  contentId: Types.ObjectId | string,
  note?: string,
): Promise<BookmarkDocument> {
  return Bookmark.create({ userId, contentType, contentId, note })
}

export async function removeById(
  userId: Types.ObjectId | string,
  bookmarkId: Types.ObjectId | string,
): Promise<boolean> {
  const result = await Bookmark.deleteOne({ _id: bookmarkId, userId })
  return result.deletedCount > 0
}

export async function removeByContent(
  userId: Types.ObjectId | string,
  contentType: BookmarkContentType,
  contentId: Types.ObjectId | string,
): Promise<boolean> {
  const result = await Bookmark.deleteOne({ userId, contentType, contentId })
  return result.deletedCount > 0
}
