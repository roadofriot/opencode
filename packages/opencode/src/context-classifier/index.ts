import type { ModelMessage } from "ai"
import { classifyMessage, getConversationLength } from "./patterns"

export type { QueryClass, ClassificationResult } from "./types"

export type ClassifyConfig = {
  shortConversationThreshold: number
  longConversationThreshold: number
}

export const defaultConfig: ClassifyConfig = {
  shortConversationThreshold: 3,
  longConversationThreshold: 10,
}

export function shouldUseThinking(messages: ModelMessage[], config: ClassifyConfig = defaultConfig): boolean {
  const userMessages = messages.filter((m) => m.role === "user")
  const conversationLength = userMessages.length

  if (conversationLength === 0) return true

  const lastUserMessage = userMessages[userMessages.length - 1]
  const text = extractText(lastUserMessage)
  const classification = classifyMessage(text)

  if (classification.class === "casual" && conversationLength <= config.shortConversationThreshold) {
    return false
  }

  if (classification.class === "simple" && conversationLength <= config.shortConversationThreshold) {
    return false
  }

  return true
}

export function suggestVariant(messages: ModelMessage[], config: ClassifyConfig = defaultConfig): string | undefined {
  const userMessages = messages.filter((m) => m.role === "user")
  const conversationLength = userMessages.length

  if (conversationLength === 0) return undefined

  const lastUserMessage = userMessages[userMessages.length - 1]
  const text = extractText(lastUserMessage)
  const classification = classifyMessage(text)

  if (classification.class === "casual") return "none"
  if (classification.class === "simple") return "low"

  if (conversationLength > config.longConversationThreshold) {
    return "high"
  }

  return undefined
}

function extractText(message: ModelMessage): string {
  if (typeof message.content === "string") return message.content
  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part.type === "text")
      .map((part) => ("text" in part ? (part as any).text : ""))
      .join(" ")
  }
  return ""
}

export * as ContextClassifier from "."
