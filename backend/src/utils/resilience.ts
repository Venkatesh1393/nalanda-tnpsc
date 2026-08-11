import { logger } from '../config/logger'

/**
 * Sprint 4 Step 73 — Production Cloud Services. Shared building blocks for
 * every third-party adapter (`config/cloudinary.ts`, `config/razorpay.ts`,
 * `config/firebase.ts`) that makes an outbound network call without its own
 * built-in timeout/retry — unlike `config/anthropic.ts`, whose SDK already
 * accepts `timeout`/`maxRetries` directly per-call (Sprint 4 Step 57/58), and
 * `config/database.ts`, whose retry lives at the connection level, not
 * per-call. Two independent, composable pieces — most call sites want both.
 */

const DEFAULT_RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
])

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`)
    this.name = 'TimeoutError'
  }
}

/**
 * Bounds how long the caller waits for `promise` — NOT true cancellation.
 * None of Cloudinary's/Razorpay's/Firebase's Node SDKs expose an
 * `AbortSignal` at this call shape, so the underlying HTTP request keeps
 * running in the background after a timeout fires here; what this actually
 * prevents is an Express request handler (and, transitively, a client) being
 * left hanging on a provider that never responds — the single biggest
 * "graceful degradation" gap an unbounded `await thirdPartySdk.call()` has.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export interface RetryOptions {
  /** Number of retry attempts AFTER the first try (2 = 3 attempts total). */
  retries: number
  initialDelayMs?: number
  maxDelayMs?: number
  /** Defaults to network-level errors only (connection reset/refused,
   * DNS failure, timeout) — deliberately excludes HTTP 4xx and anything
   * shaped like an auth/validation failure, since retrying "your API key is
   * wrong" or "this file is too large" just delays an inevitable failure
   * and burns the provider's rate limit for nothing. Pass a custom
   * predicate to also retry provider-reported 429/5xx. */
  isRetryable?: (error: unknown) => boolean
  label: string
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void
}

function isNetworkError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return typeof code === 'string' && DEFAULT_RETRYABLE_CODES.has(code)
}

/**
 * Broader than `isNetworkError` — also treats a provider-reported HTTP
 * status as transient when it's a 429 (rate limited) or 5xx (their fault,
 * not ours). Cloudinary's SDK surfaces this as `error.http_code`; Razorpay's
 * (axios-backed) SDK surfaces it as `error.statusCode` on the thrown error.
 * Never retries a 4xx other than 429 — a malformed request/bad credentials
 * fails the same way every time, so retrying just delays the real error.
 */
export function isTransientCloudError(error: unknown): boolean {
  if (isNetworkError(error)) return true
  const status = (error as { http_code?: number; statusCode?: number } | null) ?? {}
  const code = status.http_code ?? status.statusCode
  return typeof code === 'number' && (code === 429 || code >= 500)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Exponential backoff (capped), same shape as `config/database.ts`'s
 * connection retry — applied here at the level of a single outbound call
 * instead of a persistent connection. Only ever retries the *idempotent*
 * operations call sites choose to wrap (e.g. re-uploading the same buffer,
 * re-verifying a token, re-fetching an order) — never anything with a
 * side effect that isn't safe to repeat.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const {
    retries,
    initialDelayMs = 500,
    maxDelayMs = 5_000,
    isRetryable = isNetworkError,
    label,
    onRetry,
  } = options

  let attempt = 0
  let delay = initialDelayMs

  for (;;) {
    try {
      return await fn()
    } catch (error) {
      attempt += 1
      if (attempt > retries || !isRetryable(error)) throw error
      logger.warn(`${label} failed — retrying (${attempt}/${retries})`, {
        error: error instanceof Error ? error.message : String(error),
        delayMs: delay,
      })
      onRetry?.(attempt, error, delay)
      await sleep(delay)
      delay = Math.min(delay * 2, maxDelayMs)
    }
  }
}
