import type { ModelMessage } from "ai"

const casualPatterns = [
  /^(hi|hey|hello|yo|sup|heylo|namaste|नमस्ते|नमस्कार|के छ|k cha)\b/i,
  /^(how are you|how's it going|what's up|whats up|k xa|k cha|के छ)\b/i,
  /^(good morning|good afternoon|good evening|good night|शुभ प्रभात|शुभ साँझ)\b/i,
  /^[.,!?~]{1,5}$/,
  /^(ok|okay|k|thanks|thank you|धन्यवाद|thik cha|ठिक छ|huncha|हुन्छ)\b/i,
  /^(bye|goodbye|see you|later|tata|फेरि भेटौंला)\b/i,
  /^(nice|great|awesome|cool|wow|super|excellent)\b.?$/i,
  /^[🙏😊😂🔥👍😄]+$/,
]

const simplePatterns = [
  /^(what|who|when|where|why|how)\s+(is|are|was|were|does|do|did|can|could|will|would|shall|should)\s/i,
  /^(define|explain|describe|what is|what's|tell me about|summarize|translate)\b/i,
  /^(meaning of|definition of|example of)\b/i,
  /^[A-Z][a-z]+ (to|vs|and|or) [A-Z][a-z]+$/,
  /^(`[^`]+`\s*.*){1,3}$/,
  /^\w{1,3}\s+\w{1,3}\s+\w{1,3}\s*\??$/,
]

const devanagariCasualPatterns = [
  /^(नमस्ते|नमस्कार|हेलो|हाय|के छ|के छ खबर|कस्तो छ|सन्चै|सन्चै छ)\b/i,
  /^(धन्यवाद|धन्न|ठिक छ|हुन्छ|मिल्छ|पुग्यो)\b/i,
  /^(बिदा|फेरि भेटौंला|पछि गर्ने)\b/i,
  /^(हो|हैन|होइन|हुन्न|होला|हुन्छ)\s*$/i,
]

export function classifyMessage(text: string): { class: "casual" | "simple" | "complex"; score: number } {
  if (!text || text.length < 3) return { class: "casual", score: 0.95 }
  if (text.length > 500) return { class: "complex", score: 0.8 }

  for (const pattern of [...casualPatterns, ...devanagariCasualPatterns]) {
    if (pattern.test(text)) return { class: "casual", score: 0.9 }
  }

  for (const pattern of simplePatterns) {
    if (pattern.test(text)) return { class: "simple", score: 0.7 }
  }

  if (text.includes("```") || text.includes("function") || text.includes("class ") || text.includes("import "))
    return { class: "complex", score: 0.8 }

  if (text.length > 200) return { class: "complex", score: 0.6 }

  if (text.split(/\s+/).length <= 20) return { class: "simple", score: 0.5 }

  return { class: "complex", score: 0.4 }
}

export function getConversationLength(messages: ModelMessage[]): number {
  return messages.filter((m) => m.role === "user").length
}
