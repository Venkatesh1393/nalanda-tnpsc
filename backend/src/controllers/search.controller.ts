import type { Request, Response } from 'express'

import { HttpStatus } from '../constants/httpStatus'
import * as searchService from '../services/search.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import { resolveDisplayLanguage } from '../utils/language'
import type {
  AutocompleteQuery,
  GlobalSearchQuery,
  SearchHistoryQuery,
} from '../validators/search.validator'

export async function search(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const query = req.query as unknown as GlobalSearchQuery
  const page = await searchService.search(
    req.user.sub,
    query.q,
    { types: query.types, examCategory: query.examCategory },
    query.page,
    query.limit,
    lang,
  )
  sendSuccess(res, page.items, HttpStatus.OK, {
    page: page.page,
    limit: page.limit,
    total: page.total,
    totalPages: page.totalPages,
  })
}

export async function autocomplete(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const query = req.query as unknown as AutocompleteQuery
  const results = await searchService.autocomplete(
    query.q,
    { types: query.types, examCategory: query.examCategory },
    lang,
  )
  sendSuccess(res, results)
}

export async function getRecentSearches(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const results = await searchService.getRecentSearches(req.user.sub)
  sendSuccess(res, results)
}

export async function getPopularSearches(_req: Request, res: Response): Promise<void> {
  const results = await searchService.getPopularSearches()
  sendSuccess(res, results)
}

export async function removeRecentSearch(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { query } = req.query as unknown as SearchHistoryQuery
  await searchService.removeRecentSearch(req.user.sub, query)
  sendSuccess(res, { query })
}

export async function clearRecentSearches(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const result = await searchService.clearRecentSearches(req.user.sub)
  sendSuccess(res, result)
}
