import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../utils/ApiError'

/** Mounted after every route — anything that reaches here matched no route. */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`))
}
