import type { NextFunction, Request, Response } from 'express'

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>

/**
 * Wraps an async controller/middleware so a rejected promise (e.g. a thrown
 * ApiError, or a Mongoose call that fails) is forwarded to `next()` instead
 * of crashing the process — every async route handler must be wrapped in
 * this rather than using its own try/catch, so error handling stays in one
 * place (middleware/errorHandler.middleware.ts).
 */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next)
  }
}
