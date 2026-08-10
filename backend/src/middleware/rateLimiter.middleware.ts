import rateLimit from 'express-rate-limit'
import type { Request } from 'express'

import { env } from '../config/env'
import { HttpStatus } from '../constants/httpStatus'

/**
 * The app-wide baseline limiter (mounted in app.ts, applied to every
 * request). Route-specific limiters — e.g. a stricter one for OTP
 * request/verify endpoints per docs/Authentication.md §3's per-email/per-IP
 * caps — should be built with `createRateLimiter` rather than reusing this
 * one, since their windows/thresholds are deliberately different.
 */
export const defaultRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later',
    },
  },
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
})

interface RateLimiterOptions {
  windowMs: number
  max: number
  message?: string
  /** Sprint 4 Step 58 — override the default per-IP bucket, e.g. per
   * authenticated user (`req.user.sub`) for abuse protection that survives
   * IP rotation/shared-NAT false positives. Falls back to express-rate-limit's
   * own IP-based default when omitted. */
  keyGenerator?: (req: Request) => string
}

/** Factory for a scoped limiter (e.g. OTP requests, login attempts). */
export function createRateLimiter({
  windowMs,
  max,
  message,
  keyGenerator,
}: RateLimiterOptions) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
    ...(keyGenerator && { keyGenerator }),
    message: {
      success: false,
      data: null,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: message ?? 'Too many requests, please try again later',
      },
    },
  })
}
