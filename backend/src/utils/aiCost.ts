import { AI_MODEL_RATES } from '../constants/aiPricing'

/**
 * Sprint 4 Step 58 — see `constants/aiPricing.ts` for the full cost-tracking
 * architecture writeup. Returns `null` (never `0`) for a model absent from
 * the rate table, so a missing rate shows up in admin stats as a visibly
 * un-costed row rather than a silently-wrong $0 entry.
 */
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const rate = AI_MODEL_RATES[model]
  if (!rate) return null
  const cost =
    (inputTokens / 1_000_000) * rate.inputPerMillionUsd +
    (outputTokens / 1_000_000) * rate.outputPerMillionUsd
  return Math.round(cost * 1_000_000) / 1_000_000
}
