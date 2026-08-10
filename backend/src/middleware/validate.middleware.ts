import type { NextFunction, Request, Response } from 'express'
import { ZodError, type ZodType } from 'zod'

import { ApiError } from '../utils/ApiError'

export interface ValidationSchemas {
  body?: ZodType
  query?: ZodType
  params?: ZodType
}

/**
 * Validates `req.body`/`req.query`/`req.params` against the given Zod
 * schemas before a request ever reaches a controller, per
 * docs/FolderStructure.md §6's `validators/` convention. Each route
 * attaches only the schemas it needs — an omitted key is left unvalidated.
 * On success, replaces the request property with the parsed (and
 * type-coerced/defaulted) value so controllers can trust its shape.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body)
      if (schemas.query) {
        Object.assign(req.query, schemas.query.parse(req.query))
      }
      if (schemas.params) {
        Object.assign(req.params, schemas.params.parse(req.params))
      }
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          ApiError.badRequest('Request validation failed', {
            issues: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          }),
        )
        return
      }
      next(error)
    }
  }
}
