import { env } from './env'
import { logger } from './logger'
import type { CacheProvider } from '../utils/cache/CacheProvider'
import { MemoryCacheProvider } from '../utils/cache/MemoryCacheProvider'

/**
 * Sprint 4 Step 67 — the single place that decides *which* `CacheProvider`
 * backs the app, mirroring `config/razorpay.ts`/`config/anthropic.ts`'s
 * "one adapter file per swappable backend, lazy singleton" convention.
 * Every service imports `getCache()` from here, never a concrete provider
 * class directly.
 *
 * `CACHE_DRIVER=redis` is accepted by `config/env.ts` for forward
 * compatibility, but there is no `RedisCacheProvider` yet — no `ioredis`
 * dependency exists in package.json, per this step's explicit "do not
 * require Redis installation yet". Requesting it today logs one clear
 * warning and falls back to the in-memory provider rather than crashing the
 * process; swapping in a real Redis-backed provider later is a change to
 * this one function, not to any of its callers.
 */

let instance: CacheProvider | undefined
let warnedAboutMissingRedis = false

export function getCache(): CacheProvider {
  if (instance) return instance

  if (env.CACHE_DRIVER === 'redis') {
    if (!warnedAboutMissingRedis) {
      warnedAboutMissingRedis = true
      logger.warn(
        'CACHE_DRIVER=redis is set but no RedisCacheProvider is implemented yet ' +
          '(no `ioredis` dependency installed) — falling back to the in-memory cache. ' +
          'Implement utils/cache/RedisCacheProvider.ts against REDIS_URL when Redis is provisioned.',
      )
    }
  }

  instance = new MemoryCacheProvider()
  return instance
}

/** Named TTL tiers so call sites express *intent* ("this is near-static
 * content") instead of sprinkling magic second counts everywhere — pick the
 * tier that matches how stale the data is allowed to look, not an arbitrary
 * number. */
export const CACHE_TTL = {
  /** Recomputed aggregates that should feel close to live (leaderboards,
   * ranked lists). */
  SHORT: 60,
  /** Reference data that changes only via an admin action, where a short
   * visible lag after that edit is an acceptable trade-off (curriculum
   * trees, exam catalogs). */
  MEDIUM: 5 * 60,
  /** Near-static lookups (e.g. a single exam's code/name) — still safely
   * bounded by explicit `del`/`delByPrefix` calls from the admin write path
   * that owns that data, so a stale read never outlives an actual edit by
   * more than this ceiling even if invalidation is ever missed. */
  LONG: 15 * 60,
} as const

/** Joins key segments with `:` — the one place that owns the app's cache-key
 * naming convention (`<domain>:<qualifier>:<id>`), so `delByPrefix` calls
 * elsewhere can rely on it being consistent. */
export function cacheKey(...parts: (string | number)[]): string {
  return parts.map(String).join(':')
}
