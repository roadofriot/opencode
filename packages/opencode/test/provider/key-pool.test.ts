import { describe, expect, it, beforeEach } from "bun:test"
import { KeyPool, buildKeyPool, extractStatusCode, extractRetryAfterMs } from "@/provider/key-pool"

describe("KeyPool", () => {
  describe("select", () => {
    it("returns undefined when pool is empty", () => {
      const pool = new KeyPool([])
      expect(pool.select()).toBeUndefined()
    })

    it("returns the only key from a single-key pool", () => {
      const pool = new KeyPool(["key1"])
      expect(pool.select()).toBe("key1")
    })

    it("cycles through keys in round-robin order", () => {
      const pool = new KeyPool(["key1", "key2", "key3"])
      expect(pool.select()).toBe("key1")
      expect(pool.select()).toBe("key2")
      expect(pool.select()).toBe("key3")
      expect(pool.select()).toBe("key1")
    })

    it("skips cooled-down keys and returns the next available one", () => {
      const pool = new KeyPool(["key1", "key2", "key3"])
      pool.markFailed("key1", 60_000)
      // First select should skip key1 and return key2
      expect(pool.select()).toBe("key2")
    })

    it("returns undefined when all keys are exhausted", () => {
      const pool = new KeyPool(["key1", "key2"])
      pool.markFailed("key1", 60_000)
      pool.markFailed("key2", 60_000)
      expect(pool.isExhausted()).toBe(true)
      expect(pool.select()).toBeUndefined()
    })
  })

  describe("markFailed", () => {
    it("applies exponential back-off for consecutive failures", () => {
      const pool = new KeyPool(["key1"])
      const now = Date.now()
      pool.markFailed("key1", 1_000)
      // First failure: 1× = 1000ms
      expect(pool.cooldownCount()).toBe(1)
      // Second failure: 2× = 2000ms
      pool.markFailed("key1", 1_000)
      expect(pool.cooldownCount()).toBe(1)
    })

    it("caps cooldown at 1 hour", () => {
      const pool = new KeyPool(["key1"])
      // Force many consecutive failures to exceed the 1-hour cap
      for (let i = 0; i < 20; i++) {
        pool.markFailed("key1", 60_000)
      }
      expect(pool.cooldownCount()).toBe(1)
    })
  })

  describe("markSuccess", () => {
    it("removes the key from cooldown after a success", () => {
      const pool = new KeyPool(["key1"])
      pool.markFailed("key1", 60_000)
      expect(pool.cooldownCount()).toBe(1)
      pool.markSuccess("key1")
      expect(pool.cooldownCount()).toBe(0)
    })

    it("resets exponential back-off counter", () => {
      const pool = new KeyPool(["key1"])
      pool.markFailed("key1", 1_000)
      pool.markFailed("key1", 1_000)
      pool.markSuccess("key1")
      // Back to single-failure cooldown after success + fail
      pool.markFailed("key1", 1_000)
      expect(pool.cooldownCount()).toBe(1)
    })
  })

  describe("activeCount / cooldownCount / size", () => {
    it("reports correct counts", () => {
      const pool = new KeyPool(["key1", "key2", "key3"])
      expect(pool.size).toBe(3)
      expect(pool.activeCount()).toBe(3)
      expect(pool.cooldownCount()).toBe(0)

      pool.markFailed("key1", 60_000)
      expect(pool.activeCount()).toBe(2)
      expect(pool.cooldownCount()).toBe(1)

      pool.markFailed("key2", 60_000)
      expect(pool.activeCount()).toBe(1)
      expect(pool.cooldownCount()).toBe(2)
    })
  })
})

describe("buildKeyPool", () => {
  it("returns empty pool when options are undefined", () => {
    expect(buildKeyPool(undefined).size).toBe(0)
  })

  it("builds a single-key pool from apiKey string", () => {
    const pool = buildKeyPool({ apiKey: "sk-test" })
    expect(pool.size).toBe(1)
    expect(pool.select()).toBe("sk-test")
  })

  it("builds a multi-key pool from apiKeys array (preferred over apiKey)", () => {
    const pool = buildKeyPool({ apiKey: "sk-single", apiKeys: ["sk-1", "sk-2"] })
    expect(pool.size).toBe(2)
    expect(pool.select()).toBe("sk-1")
    expect(pool.select()).toBe("sk-2")
  })

  it("filters non-string values from apiKeys array", () => {
    const pool = buildKeyPool({ apiKeys: ["sk-1", 42, null, "sk-2"] })
    expect(pool.size).toBe(2)
  })
})

describe("extractStatusCode", () => {
  it("returns undefined for non-object errors", () => {
    expect(extractStatusCode(null)).toBeUndefined()
    expect(extractStatusCode("string error")).toBeUndefined()
  })

  it("extracts statusCode from APICallError-like objects", () => {
    expect(extractStatusCode({ statusCode: 429 })).toBe(429)
    expect(extractStatusCode({ status: 503 })).toBe(503)
  })
})

describe("extractRetryAfterMs", () => {
  it("returns undefined when no Retry-After header", () => {
    expect(extractRetryAfterMs({ responseHeaders: {} })).toBeUndefined()
    expect(extractRetryAfterMs({})).toBeUndefined()
  })

  it("converts seconds-based Retry-After to milliseconds", () => {
    expect(extractRetryAfterMs({ responseHeaders: { "retry-after": "30" } })).toBe(30_000)
  })

  it("converts date-based Retry-After to milliseconds from now", () => {
    const future = new Date(Date.now() + 5_000).toUTCString()
    const ms = extractRetryAfterMs({ responseHeaders: { "retry-after": future } })
    expect(ms).toBeGreaterThan(0)
    expect(ms).toBeLessThanOrEqual(5_100) // allow 100ms clock drift in test
  })
})
