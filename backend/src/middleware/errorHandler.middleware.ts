import type { NextFunction, Request, Response } from 'express'
import { MulterError } from 'multer'
import mongoose from 'mongoose'

import { isProduction } from '../config/env'
import { logger } from '../config/logger'
import { HttpStatus } from '../constants/httpStatus'
import { ApiError } from '../utils/ApiError'
import { sendError } from '../utils/ApiResponse'
import { recordSystemEvent } from '../utils/systemEvents'

/**
 * The single place an error becomes an HTTP response. Mounted last in
 * app.ts (per Express convention, a 4-arg function is what marks this as
 * error-handling middleware). Every other part of the app should just
 * `throw`/`next(error)` an `ApiError` (or let asyncHandler forward a
 * rejected promise here) rather than formatting its own error response.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    if (!error.isOperational) {
      logger.error(error.message, { stack: error.stack, path: req.path })
      // Sprint 4 Step 74 — a non-operational ApiError is still an
      // unexpected bug (the operational/non-operational split is about
      // "was this thrown deliberately for an expected condition," not
      // severity), so it's tracked the same as the generic 500 branch below.
      recordSystemEvent({
        type: 'error',
        severity: 'error',
        message: error.message,
        source: `${req.method} ${req.path}`,
        metadata: { statusCode: error.statusCode, code: error.code },
      })
    }
    sendError(res, error.statusCode, error.message, error.code, error.details)
    return
  }

  if (error instanceof MulterError) {
    // A too-large/too-many-files upload is a client mistake, not a server
    // bug — without this branch it would otherwise fall through to the
    // generic 500 case below and leak as an "unexpected error."
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large'
        : error.code === 'LIMIT_UNEXPECTED_FILE'
          ? `Unexpected file field: ${error.field ?? 'unknown'}`
          : error.message
    sendError(res, HttpStatus.BAD_REQUEST, message, `UPLOAD_${error.code}`)
    return
  }

  if (error instanceof mongoose.Error.ValidationError) {
    sendError(res, HttpStatus.BAD_REQUEST, 'Validation failed', 'VALIDATION_ERROR', {
      fields: Object.keys(error.errors),
    })
    return
  }

  if (error instanceof mongoose.Error.CastError) {
    sendError(
      res,
      HttpStatus.BAD_REQUEST,
      `Invalid value for field "${error.path}"`,
      'INVALID_ID',
    )
    return
  }

  if (isMongoDuplicateKeyError(error)) {
    sendError(
      res,
      HttpStatus.CONFLICT,
      'A record with this value already exists',
      'DUPLICATE_KEY',
    )
    return
  }

  // Anything else is an unexpected bug — log it in full, but never leak
  // internals (stack traces, driver error messages) to the client.
  const message = error instanceof Error ? error.message : 'Unknown error'
  const stack = error instanceof Error ? error.stack : undefined
  logger.error(message, { stack, path: req.path, method: req.method })
  recordSystemEvent({
    type: 'error',
    severity: 'critical',
    message,
    source: `${req.method} ${req.path}`,
    metadata: { statusCode: HttpStatus.INTERNAL_SERVER_ERROR },
  })

  sendError(
    res,
    HttpStatus.INTERNAL_SERVER_ERROR,
    isProduction ? 'Something went wrong. Please try again later.' : message,
    'INTERNAL_SERVER_ERROR',
  )
}

function isMongoDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 11000
  )
}
