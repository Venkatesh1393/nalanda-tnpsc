import type { HttpStatusCode } from '../constants/httpStatus'

/**
 * Every intentionally-thrown error in the app should be (or extend) this
 * class — middleware/errorHandler.middleware.ts uses `isOperational` to
 * distinguish "expected" failures (bad input, not found, unauthorized) that
 * are safe to describe to the client from unexpected bugs, which get a
 * generic message instead so internals are never leaked.
 */
export class ApiError extends Error {
  public readonly statusCode: HttpStatusCode
  public readonly code: string
  public readonly details?: unknown
  public readonly isOperational: boolean

  constructor(
    statusCode: HttpStatusCode,
    message: string,
    code = 'ERROR',
    details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, 'BAD_REQUEST', details)
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED')
  }

  static forbidden(message = 'You do not have permission to do this'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN')
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message, 'NOT_FOUND')
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message, 'CONFLICT')
  }

  static unprocessable(message: string, details?: unknown): ApiError {
    return new ApiError(422, message, 'UNPROCESSABLE_ENTITY', details)
  }

  static tooManyRequests(
    message = 'Too many requests, please try again later',
  ): ApiError {
    return new ApiError(429, message, 'TOO_MANY_REQUESTS')
  }

  static internal(message = 'Something went wrong'): ApiError {
    return new ApiError(500, message, 'INTERNAL_SERVER_ERROR')
  }
}
