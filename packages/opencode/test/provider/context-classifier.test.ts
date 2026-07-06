import { describe, expect, it } from "bun:test"
import { shouldUseThinking, suggestVariant } from "@/context-classifier"
import type { ModelMessage } from "ai"

function userMessages(...texts: string[]): ModelMessage[] {
  return texts.map((text) => ({ role: "user" as const, content: text }))
}

describe("shouldUseThinking", () => {
  it("returns true for empty conversation", () => {
    expect(shouldUseThinking([])).toBe(true)
  })

  describe("casual messages in short conversations", () => {
    it("suppresses thinking for greeting", () => {
      expect(shouldUseThinking(userMessages("Hello"))).toBe(false)
    })

    it("suppresses thinking for Nepali greeting", () => {
      expect(shouldUseThinking(userMessages("नमस्ते"))).toBe(false)
    })

    it("suppresses thinking for simple thank-you", () => {
      expect(shouldUseThinking(userMessages("thanks"))).toBe(false)
    })

    it("suppresses thinking for emoji-only message", () => {
      expect(shouldUseThinking(userMessages("🙏"))).toBe(false)
    })
  })

  describe("simple Q&A in short conversations", () => {
    it("suppresses thinking for simple factual question", () => {
      expect(shouldUseThinking(userMessages("What is TypeScript?"))).toBe(false)
    })

    it("suppresses thinking for define query", () => {
      expect(shouldUseThinking(userMessages("Define recursion"))).toBe(false)
    })
  })

  describe("complex messages", () => {
    it("enables thinking for code generation request", () => {
      expect(
        shouldUseThinking(
          userMessages(
            "Write a TypeScript function that implements a B-tree data structure with insert, delete, and search operations",
          ),
        ),
      ).toBe(true)
    })

    it("enables thinking for message with code block", () => {
      expect(
        shouldUseThinking(
          userMessages("Refactor this:\n```typescript\nfunction foo() { return 1 }\n```"),
        ),
      ).toBe(true)
    })

    it("enables thinking for long message", () => {
      const longMsg = "a ".repeat(300)
      expect(shouldUseThinking(userMessages(longMsg))).toBe(true)
    })
  })

  describe("conversation length effects", () => {
    it("enables thinking for casual message in long conversation", () => {
      const longConversation = Array.from({ length: 10 }, (_, i) =>
        i % 2 === 0
          ? { role: "user" as const, content: "question " + i }
          : { role: "assistant" as const, content: "answer " + i },
      )
      // Even a casual message should use thinking after many turns
      const msgs: ModelMessage[] = [...longConversation, { role: "user", content: "ok" }]
      expect(shouldUseThinking(msgs)).toBe(true)
    })
  })
})

describe("suggestVariant", () => {
  it("returns undefined for empty conversation", () => {
    expect(suggestVariant([])).toBeUndefined()
  })

  it("suggests none for casual message", () => {
    expect(suggestVariant(userMessages("Hi!"))).toBe("none")
  })

  it("suggests low for simple question", () => {
    expect(suggestVariant(userMessages("What is Python?"))).toBe("low")
  })

  it("suggests high for long conversation with complex message", () => {
    // Build a 12-message conversation (> longConversationThreshold of 10)
    const msgs: ModelMessage[] = Array.from({ length: 12 }, (_, i) => ({
      role: "user" as const,
      content: "Complex technical question " + i,
    }))
    expect(suggestVariant(msgs)).toBe("high")
  })

  it("returns undefined for complex message in short conversation", () => {
    expect(suggestVariant(userMessages("Implement a red-black tree in TypeScript"))).toBeUndefined()
  })
})
