import type { Request, Response } from 'express'

import type { BookmarkContentType } from '../constants/bookmarks'
import { HttpStatus } from '../constants/httpStatus'
import * as bookmarkService from '../services/bookmark.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import { resolveDisplayLanguage } from '../utils/language'
import type { CreateBookmarkBody } from '../validators/bookmark.validator'

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const result = await bookmarkService.createBookmark(
    req.user.sub,
    req.body as CreateBookmarkBody,
  )
  sendSuccess(res, result, HttpStatus.CREATED)
}

export async function toggle(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const bookmarked = await bookmarkService.toggleBookmark(
    req.user.sub,
    req.body as CreateBookmarkBody,
  )
  sendSuccess(res, { bookmarked })
}

export async function remove(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { bookmarkId = '' } = req.params
  await bookmarkService.removeBookmark(req.user.sub, bookmarkId)
  sendSuccess(res, { deleted: true })
}

export async function list(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const contentType = req.query.contentType as BookmarkContentType | undefined
  const bookmarks = await bookmarkService.listBookmarks(req.user.sub, lang, contentType)
  sendSuccess(res, bookmarks)
}
