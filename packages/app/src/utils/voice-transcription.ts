/**
 * Voice transcription utilities for prompt-input.
 *
 * Contains:
 * - WAV encoding (PCM Float32 → 16-bit WAV Blob)
 * - Script validation (reject hallucinated output in wrong language)
 * - Cloud STT adapters: OpenAI Whisper, Gemini, Groq, HuggingFace
 *
 * All functions are pure (no side effects, no UI dependencies) so they can
 * be tested independently and reused outside the prompt input component.
 */

// ---------------------------------------------------------------------------
// WAV encoding
// ---------------------------------------------------------------------------

/** Encodes a Float32Array of 16kHz mono audio samples into a WAV Blob. */
export function encodeWAV(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, "WAVE")
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 16000, true)
  view.setUint32(28, 16000 * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, "data")
  view.setUint32(40, samples.length * 2, true)

  floatTo16BitPCM(view, 44, samples)

  return new Blob([view], { type: "audio/wav" })
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
}

// ---------------------------------------------------------------------------
// Script validation
// ---------------------------------------------------------------------------

// Script ranges for detecting misidentified language output
const DEVANAGARI_RE = /[\u0900-\u097F]/
// CJK: Chinese, Japanese Kanji, Korean Hangul, and other East Asian scripts
const CJK_RE =
  /[\u4E00-\u9FFF\u3400-\u4DBF\u3000-\u303F\uFF00-\uFFEF\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/
// Arabic script covers Urdu, Arabic, Persian, etc.
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/
// Thai, Lao, Myanmar etc. — also commonly confused with Devanagari by small models
const OTHER_ASIAN_RE = /[\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F]/

/**
 * When the user has selected Nepali (ne) or Hindi (hi), checks whether the
 * transcription output is in a completely wrong script (CJK, Arabic, Thai, etc.)
 * and discards the hallucinated output silently by returning an empty string.
 */
export function validateTranscriptScript(text: string, languageCode: string): string {
  if (!text || !languageCode || languageCode === "auto") return text
  if (languageCode !== "ne" && languageCode !== "hi") return text

  const chars = [...text.trim()]
  if (chars.length === 0) return text

  const cjkCount = chars.filter((c) => CJK_RE.test(c)).length
  const arabicCount = chars.filter((c) => ARABIC_RE.test(c)).length
  const otherAsianCount = chars.filter((c) => OTHER_ASIAN_RE.test(c)).length
  const devanagariCount = chars.filter((c) => DEVANAGARI_RE.test(c)).length
  const wrongScript = cjkCount + arabicCount + otherAsianCount

  // If more than 20% of characters are wrong-script and almost no Devanagari, reject
  if (wrongScript / chars.length > 0.2 && devanagariCount < 2) {
    console.warn(
      `[VOICE] Script mismatch detected for language "${languageCode}". ` +
        `CJK/Korean: ${cjkCount}, Arabic/Urdu: ${arabicCount}, Thai/Other: ${otherAsianCount}, Devanagari: ${devanagariCount}. ` +
        `Discarding hallucinated output: "${text.slice(0, 60)}"`,
    )
    return ""
  }
  return text
}

// ---------------------------------------------------------------------------
// Cloud STT adapters
// ---------------------------------------------------------------------------

/** Transcribes a WAV blob using OpenAI Whisper API. */
export async function transcribeWithOpenAI(wavBlob: Blob, apiKey: string, languageCode: string): Promise<string> {
  const formData = new FormData()
  formData.append("file", wavBlob, "recording.wav")
  formData.append("model", "whisper-1")
  if (languageCode && languageCode !== "auto") {
    formData.append("language", languageCode)
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  return result.text || ""
}

const geminiLanguagePromptMap: Record<string, string> = {
  ne: "The audio is in Nepali. Transcribe it exactly as spoken in Nepali Devanagari script (नेपाली देवनागरी लिपिमा). Do not transliterate into Roman letters. Do not translate into English.",
  hi: "The audio is in Hindi. Transcribe it exactly as spoken in Hindi Devanagari script. Do not transliterate or translate.",
  en: "The audio is in English. Transcribe it exactly as spoken in English.",
  es: "The audio is in Spanish. Transcribe it exactly as spoken in Spanish.",
  fr: "The audio is in French. Transcribe it exactly as spoken in French.",
  de: "The audio is in German. Transcribe it exactly as spoken in German.",
  ja: "The audio is in Japanese. Transcribe it exactly as spoken in Japanese script.",
  zh: "The audio is in Chinese (Mandarin). Transcribe it exactly as spoken in Chinese characters.",
}

/** Transcribes a WAV blob using the Gemini multimodal API, trying multiple models. */
export async function transcribeWithGemini(wavBlob: Blob, apiKey: string, languageCode: string): Promise<string> {
  const arrayBuffer = await wavBlob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64Data = btoa(binary)

  const languageInstruction =
    languageCode && languageCode !== "auto"
      ? (geminiLanguagePromptMap[languageCode] ??
          `The audio is in language code "${languageCode}". Transcribe it exactly as spoken in its native script.`)
      : "Detect the language automatically and transcribe exactly as spoken in the original script. If Nepali, use Devanagari (नेपाली). If Hindi, use Devanagari. If Chinese or Japanese, use their respective scripts."

  const transcriptionPrompt = `${languageInstruction} Output only the raw transcription — no translations, no summaries, no notes, no headers, no explanations.`

  const payload = {
    contents: [
      {
        parts: [
          { inlineData: { mimeType: "audio/wav", data: base64Data } },
          { text: transcriptionPrompt },
        ],
      },
    ],
    generationConfig: { temperature: 0.0 },
  }

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest"]
  let lastError: Error | null = null

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        lastError = new Error(`Gemini API failed for model ${model}: ${response.status} - ${errorText}`)
        continue
      }

      const result = await response.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError ?? new Error("All Gemini models failed to transcribe the audio.")
}

/** Transcribes a WAV blob using the Groq Whisper API. */
export async function transcribeWithGroq(wavBlob: Blob, apiKey: string, languageCode: string): Promise<string> {
  const formData = new FormData()
  formData.append("file", wavBlob, "recording.wav")
  formData.append("model", "whisper-large-v3-turbo")
  if (languageCode && languageCode !== "auto") {
    formData.append("language", languageCode)
  }

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Groq API failed: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  return result.text || ""
}

/** Transcribes a WAV blob using the HuggingFace Whisper inference API. */
export async function transcribeWithHuggingFace(
  wavBlob: Blob,
  token: string | undefined,
  languageCode: string,
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const arrayBuffer = await wavBlob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64Audio = btoa(binary)

  const parameters: Record<string, unknown> = { return_timestamps: false }
  if (languageCode && languageCode !== "auto") {
    parameters.language = languageCode
  }

  const response = await fetch("https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo", {
    method: "POST",
    headers,
    body: JSON.stringify({ inputs: base64Audio, parameters }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Hugging Face API failed: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  return result.text || ""
}
