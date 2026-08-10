import Anthropic from '@anthropic-ai/sdk'

import { env } from './env'

/**
 * Sprint 4 Step 57 — the only file besides `services/ai/questionExplanation.
 * service.ts` that touches the `@anthropic-ai/sdk` directly (same "one
 * adapter file per third-party SDK" convention as `config/cloudinary.ts`/
 * `config/razorpay.ts`).
 *
 * Deliberately lazy and optional-safe, same reasoning as Razorpay: the
 * server must keep booting even before a real Anthropic key exists
 * (`env.ts`'s `ANTHROPIC_API_KEY` is `.optional()`), so construction happens
 * on first use, and every caller goes through `isAnthropicConfigured()`
 * first. This is also the enforcement point for "AI unavailable must never
 * break Smart Practice" — a missing key fails one request with a clear
 * error, never the whole app.
 */

export const AI_MODEL = 'claude-haiku-4-5'
export const AI_PROVIDER = 'anthropic'

let client: Anthropic | null = null

export function isAnthropicConfigured(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY)
}

export function getAnthropicClient(): Anthropic {
  if (!isAnthropicConfigured()) {
    throw new Error('Anthropic is not configured — set ANTHROPIC_API_KEY in backend/.env')
  }
  if (!client) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  }
  return client
}
