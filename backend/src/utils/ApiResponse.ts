import type { Response } from 'express'

import { HttpStatus, type HttpStatusCode } from '../constants/httpStatus'
import type { ApiErrorBody, ApiMeta, ApiSuccessBody } from '../types/apiResponse.types'

/**
 * The single place that shapes a response body — every controller should
 * call `sendSuccess`/`sendError` instead of `res.json(...)` directly, so the
 * `{ success, data, error, meta }` envelope (docs/API.md) never drifts
 * endpoint-to-endpoint.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: HttpStatusCode = HttpStatus.OK,
  meta?: ApiMeta,
): Response<ApiSuccessBody<T>> {
  const body: ApiSuccessBody<T> = {
    success: true,
    data,
    error: null,
    ...(meta && { meta }),
  }
  return res.status(statusCode).json(body)
}

export function sendError(
  res: Response,
  statusCode: HttpStatusCode,
  message: string,
  code = 'ERROR',
  details?: unknown,
): Response<ApiErrorBody> {
  const body: ApiErrorBody = {
    success: false,
    data: null,
    error: { code, message, ...(details !== undefined && { details }) },
  }
  return res.status(statusCode).json(body)
}
