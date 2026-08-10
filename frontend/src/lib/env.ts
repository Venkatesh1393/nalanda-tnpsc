import { z } from 'zod'

/**
 * Validates import.meta.env once, at module load, so a missing or malformed
 * environment variable fails loudly at app startup rather than causing an
 * obscure runtime error the first time a feature that needs it is used.
 * Import `env` from here everywhere instead of reading import.meta.env directly.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_RAZORPAY_KEY_ID: z.string().min(1),
  VITE_CLOUDINARY_CLOUD_NAME: z.string().min(1),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  // Thrown (not just logged) so a misconfigured environment cannot silently
  // ship with, e.g., a missing Firebase key that only breaks login later.
  throw new Error(
    `Invalid environment configuration:\n${parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')}\n\nCheck your .env.local against .env.example.`,
  )
}

export const env = parsed.data
export const isDevelopment = env.VITE_APP_ENV === 'development'
export const isProduction = env.VITE_APP_ENV === 'production'
