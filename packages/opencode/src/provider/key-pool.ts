/**
 * KeyPool — manages a pool of API keys for a single provider.
 *
 * When multiple API keys are configured for a provider the pool distributes
 * requests across them in a round-robin order. A key that encounters a rate
 * limit (HTTP 429) or quota error is placed into a cooldown period and skipped
 * until it recovers, so the next available key is tried automatically.
 *
 * Usage:
 *   const pool = new KeyPool(["key1", "key2", "key3"])
 *   const key = pool.select()            // round-robin pick
 *   pool.markFailed(key, 60_000)         // cool down for 60s on 429
 *   pool.markSuccess(key)                // reset failure count
 */
export class KeyPool {
  private index = 0
  private readonly cooldown = new Map<string, number>()
  private readonly failures = new Map<string, number>()

  constructor(private readonly keys: readonly string[]) {}

  /** Returns true when every key is in cooldown. */
  isExhausted(): boolean {
    const now = Date.now()
    return this.keys.every((k) => {
      const until = this.cooldown.get(k)
      return until !== undefined && now < until
    })
  }

  /**
   * Returns the next available key using round-robin selection.
   * Skips keys that are in cooldown. Returns undefined when all keys are
   * exhausted, allowing the caller to surface an appropriate error.
   */
  select(): string | undefined {
    if (this.keys.length === 0) return undefined
    if (this.isExhausted()) return undefined

    const now = Date.now()
    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[this.index % this.keys.length]
      this.index++
      const until = this.cooldown.get(key)
      if (!until || now >= until) return key
    }
    return undefined
  }

  /**
   * Marks a key as temporarily failed and puts it on cooldown.
   * Consecutive failures for the same key extend the cooldown exponentially
   * up to a 1-hour cap, mirroring common retry-after semantics.
   *
   * @param key        The API key that failed.
   * @param cooldownMs Minimum cooldown in milliseconds (e.g. from Retry-After header).
   *                   Defaults to 60 seconds.
   */
  markFailed(key: string, cooldownMs = 60_000): void {
    const failures = (this.failures.get(key) ?? 0) + 1
    this.failures.set(key, failures)
    // Exponential back-off: 1× → 2× → 4× → … capped at 1 hour.
    const backoff = Math.min(cooldownMs * 2 ** (failures - 1), 3_600_000)
    this.cooldown.set(key, Date.now() + backoff)
  }

  /**
   * Resets the failure count and cooldown for a key after a successful call.
   */
  markSuccess(key: string): void {
    this.failures.delete(key)
    this.cooldown.delete(key)
  }

  /** Returns the number of keys currently in cooldown. */
  cooldownCount(): number {
    const now = Date.now()
    return [...this.cooldown.values()].filter((until) => now < until).length
  }

  /** Returns the number of active (non-cooled-down) keys. */
  activeCount(): number {
    return this.keys.length - this.cooldownCount()
  }

  get size(): number {
    return this.keys.length
  }
}

/**
 * Builds a KeyPool from provider config options.
 *
 * Accepts either a single `apiKey` string or an `apiKeys` array so existing
 * single-key configs work without changes.
 */
export function buildKeyPool(options: Record<string, unknown> | undefined): KeyPool {
  if (!options) return new KeyPool([])
  const single = typeof options["apiKey"] === "string" ? options["apiKey"] : undefined
  const multi = Array.isArray(options["apiKeys"])
    ? (options["apiKeys"] as unknown[]).filter((k): k is string => typeof k === "string")
    : []
  const keys = multi.length > 0 ? multi : single ? [single] : []
  return new KeyPool(keys)
}

/**
 * Returns the HTTP status code from an unknown error, if available.
 * Used to detect 429 rate-limit responses for key pool cooldown.
 */
export function extractStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined
  const e = error as Record<string, unknown>
  if (typeof e["statusCode"] === "number") return e["statusCode"]
  if (typeof e["status"] === "number") return e["status"]
  return undefined
}

/** Returns the Retry-After header value in milliseconds, if present. */
export function extractRetryAfterMs(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined
  const headers = (error as Record<string, unknown>)["responseHeaders"]
  if (!headers || typeof headers !== "object") return undefined
  const retryAfter = (headers as Record<string, string>)["retry-after"]
  if (!retryAfter) return undefined
  const seconds = Number(retryAfter)
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000
  const date = new Date(retryAfter)
  const ms = date.getTime() - Date.now()
  return ms > 0 ? ms : undefined
}

export * as KeyPool from "./key-pool"
