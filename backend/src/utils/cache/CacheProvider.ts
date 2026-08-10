/**
 * Sprint 4 Step 67 — the storage-agnostic contract every cache backend
 * implements. Services/repositories should only ever import `getCache()`
 * from `config/cache.ts` and depend on this interface, never on
 * `MemoryCacheProvider` directly — that's what lets a future
 * `RedisCacheProvider` (Sprint 5+, once `ioredis` is actually installed and
 * a `REDIS_URL` exists) drop in without touching a single call site.
 */
export interface CacheProvider {
  /** `null` on both a genuine miss and an expired entry — callers never need
   * to distinguish the two. */
  get<T>(key: string): Promise<T | null>

  /** `ttlSeconds` is required, not optional-with-a-default, so every call
   * site states its own staleness tolerance explicitly (see `CACHE_TTL` in
   * `config/cache.ts` for the shared named tiers). */
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>

  del(key: string): Promise<void>

  /** Invalidates every key starting with `prefix` — how a write path busts
   * a whole family of cached reads (e.g. `learn:subjects:`) without tracking
   * each exact key it might have populated. */
  delByPrefix(prefix: string): Promise<void>

  /** Read-through helper: returns the cached value if present, otherwise
   * calls `loader`, caches its result, and returns it. The one entry point
   * most call sites should actually use instead of `get`/`set` by hand. */
  wrap<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T>
}
