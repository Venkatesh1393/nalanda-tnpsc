import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

/**
 * Validates process.env once, at module load, so a missing or malformed
 * environment variable fails loudly at server startup rather than causing an
 * obscure runtime error the first time a feature that needs it is used.
 * Import `env` from here everywhere instead of reading process.env directly.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_VERSION: z.string().min(1).default('v1'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_ACCESS_PRIVATE_KEY_BASE64: z
    .string()
    .min(1, 'JWT_ACCESS_PRIVATE_KEY_BASE64 is required'),
  JWT_ACCESS_PUBLIC_KEY_BASE64: z
    .string()
    .min(1, 'JWT_ACCESS_PUBLIC_KEY_BASE64 is required'),
  JWT_REFRESH_PRIVATE_KEY_BASE64: z
    .string()
    .min(1, 'JWT_REFRESH_PRIVATE_KEY_BASE64 is required'),
  JWT_REFRESH_PUBLIC_KEY_BASE64: z
    .string()
    .min(1, 'JWT_REFRESH_PUBLIC_KEY_BASE64 is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('30d'),
  JWT_ISSUER: z.string().min(1).default('nalanda-tnpsc'),

  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_CLIENT_EMAIL: z.string().email('FIREBASE_CLIENT_EMAIL must be an email'),
  FIREBASE_PRIVATE_KEY_BASE64: z
    .string()
    .min(1, 'FIREBASE_PRIVATE_KEY_BASE64 is required'),

  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // --- Cache (Sprint 4 Step 67) --- `memory` needs nothing further and is
  // the default everywhere including production until a real Redis instance
  // exists; `redis` is accepted here so ops can flip it on the day Redis is
  // actually provisioned, but `config/cache.ts` currently falls back to
  // `memory` with a logged warning if chosen, since `RedisCacheProvider`
  // isn't implemented yet (no `ioredis` dependency installed) — per this
  // step's explicit "do not require Redis installation yet".
  CACHE_DRIVER: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().optional(),

  // --- Razorpay (Sprint 4 Step 56, TEST MODE only) ---
  // Deliberately optional, unlike Firebase/Cloudinary above — this server
  // must keep booting for every other module even before a real Razorpay
  // account exists. `config/razorpay.ts` checks these at call time and
  // fails a single request with a clear error, never the whole process.
  // Get test-mode values from the Razorpay Dashboard → Settings → API Keys
  // (key id/secret) and → Settings → Webhooks (webhook secret, set when
  // configuring the webhook URL — same secret must be entered on both
  // sides). NEVER use live-mode keys here.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // --- Anthropic (Sprint 4 Step 57, Premium AI Explanation) ---
  // Optional for the same reason as Razorpay above — the server keeps
  // booting without it; `config/anthropic.ts` checks presence at call time
  // and the AI explanation endpoint fails gracefully (never breaks Smart
  // Practice's standard explanation) until a real key is added.
  ANTHROPIC_API_KEY: z.string().optional(),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // Thrown (not just logged) so a misconfigured environment cannot silently
  // boot with, e.g., a missing JWT key that only breaks login later.
  console.error(
    `Invalid environment configuration:\n${parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')}\n\nCheck your .env against .env.example.`,
  )
  process.exit(1)
}

export const env = parsed.data
export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'

/** CORS_ORIGIN may be a single origin or a comma-separated list. */
export const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
console.log("NODE_ENV =", env.NODE_ENV)
console.log("CORS_ORIGIN =", env.CORS_ORIGIN)
console.log("corsOrigins =", corsOrigins)

/**
 * Sprint 4 Step 68 — Production Readiness. Catches the specific
 * misconfigurations that are easy to ship by accident (a `.env` copied from
 * a dev box, a placeholder never swapped) and that Zod's shape-level schema
 * above can't express, since they're about *values*, not types. Runs once
 * at boot, right after `env`/`corsOrigins` exist, so it can inspect the
 * fully-parsed config.
 *
 * A wildcard CORS origin is a hard failure — combined with `credentials:
 * true` (`app.ts`), it's both meaningless (browsers reject the combination
 * outright) and, if a proxy/browser ever accepted it anyway, a real
 * cross-origin credential-leak risk, so this refuses to boot rather than
 * degrade quietly. Everything else here is a loud warning, not a crash —
 * e.g. a `localhost` origin in production is almost certainly wrong but
 * *could* be a deliberate staging setup, so the server still starts.
 */
function validateProductionConfig(): void {
  if (!isProduction) return

  if (corsOrigins.includes('*')) {
    console.error(
      'CORS_ORIGIN is "*" with NODE_ENV=production — refusing to start. ' +
        'A wildcard origin combined with credentialed requests (app.ts) is ' +
        'both non-functional and unsafe; set CORS_ORIGIN to the real ' +
        'origin(s) that should be allowed to call this API.',
    )
    process.exit(1)
  }

  const looksLocal = corsOrigins.filter(
    (origin) => origin.includes('localhost') || origin.includes('127.0.0.1'),
  )
  if (looksLocal.length > 0) {
    console.warn(
      `CORS_ORIGIN includes a localhost-looking value (${looksLocal.join(', ')}) ` +
        'while NODE_ENV=production — confirm this is intentional (e.g. a ' +
        'staging box) before relying on it.',
    )
  }

  if (!env.RAZORPAY_WEBHOOK_SECRET && (env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_SECRET)) {
    console.warn(
      'RAZORPAY_KEY_ID/SECRET are set but RAZORPAY_WEBHOOK_SECRET is blank in ' +
        'production — checkout can create orders but subscriptions will never ' +
        'activate, since only the webhook grants entitlements (services/payment.service.ts).',
    )
  }
}

validateProductionConfig()
