import { z } from 'zod'

/**
 * Body shape for both `POST /auth/google` and `POST /auth/email` — a
 * verified Firebase ID token plus the client's Remember Me choice
 * (docs/Authentication.md §9: controls the refresh cookie's persistence,
 * not a second token type). Password itself never reaches this backend —
 * Firebase's client SDK is what verified it.
 */
export const establishSessionSchema = z.object({
  firebaseIdToken: z.string().min(1, 'firebaseIdToken is required'),
  rememberMe: z.boolean().optional().default(true),
})

export type EstablishSessionBody = z.infer<typeof establishSessionSchema>
