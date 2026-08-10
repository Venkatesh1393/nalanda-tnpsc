import { Router } from 'express'

import * as searchController from '../controllers/search.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import {
  autocompleteQuerySchema,
  globalSearchQuerySchema,
  searchHistoryQuerySchema,
} from '../validators/search.validator'

const router = Router()

// Static paths registered before any future `/:param` route, same
// Express-declaration-order convention as every other module.
router.get(
  '/autocomplete',
  authenticate,
  validate({ query: autocompleteQuerySchema }),
  asyncHandler(searchController.autocomplete),
)

router.get(
  '/history/recent',
  authenticate,
  asyncHandler(searchController.getRecentSearches),
)

router.get(
  '/history/popular',
  authenticate,
  asyncHandler(searchController.getPopularSearches),
)

router.delete(
  '/history/all',
  authenticate,
  asyncHandler(searchController.clearRecentSearches),
)

router.delete(
  '/history',
  authenticate,
  validate({ query: searchHistoryQuerySchema }),
  asyncHandler(searchController.removeRecentSearch),
)

router.get(
  '/',
  authenticate,
  validate({ query: globalSearchQuerySchema }),
  asyncHandler(searchController.search),
)

export default router
