import type { CacheProvider } from './CacheProvider'

interface Entry {
  value: unknown
  expiresAt: number
}

const SWEEP_INTERVAL_MS = 60_000

/**
 * The only `CacheProvider` implementation that exists today — a plain
 * in-process `Map` with per-key TTLs. Zero external dependencies, so the app
 * caches without requiring Redis to be installed (per this step's explicit
 * "do not require Redis installation yet"). Trade-off, stated plainly: this
 * cache is per-process and lost on restart/redeploy, and doesn't share state
 * across multiple server instances — fine at this project's current single-
 * instance scale, and exactly the gap `RedisCacheProvider` closes later
 * without any caller-side changes (see `CacheProvider.ts`).
 */
export class MemoryCacheProvider implements CacheProvider {
  private readonly store = new Map<string, Entry>()

  constructor() {
    // `.unref()` so this timer never keeps the Node process alive on its
    // own — graceful shutdown (`server.ts`) closes exactly as it did before
    // this class existed.
    setInterval(() => this.sweep(), SWEEP_INTERVAL_MS).unref()
  }

  private sweep(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key)
    }
  }

  get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return Promise.resolve(null)
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return Promise.resolve(null)
    }
    return Promise.resolve(entry.value as T)
  }

  set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
    return Promise.resolve()
  }

  del(key: string): Promise<void> {
    this.store.delete(key)
    return Promise.resolve()
  }

  delByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
    return Promise.resolve()
  }

  async wrap<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached
    const value = await loader()
    await this.set(key, value, ttlSeconds)
    return value
  }

  /** Test-only escape hatch — not part of `CacheProvider`, so no caller
   * outside a test can depend on being able to nuke the whole cache. */
  clear(): void {
    this.store.clear()
  }
}
