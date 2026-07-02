import { env, pipeline } from "@xenova/transformers"

env.allowLocalModels = false
env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/"

let pipelineInstance: unknown = null
let currentModel: string | null = null

async function getPipeline(model: string) {
  if (pipelineInstance && currentModel === model) {
    console.log(`[WHISPER_WORKER] Reusing existing pipeline for model: ${model}`)
    return pipelineInstance
  }

  console.log(`[WHISPER_WORKER] Loading pipeline for model: ${model}`)
  pipelineInstance = await pipeline("automatic-speech-recognition", model, {
    progress_callback: (data: { status: string; file: string; progress?: number }) => {
      if (data.status === "initiate" || data.status === "progress" || data.status === "done") {
        self.postMessage({
          type: "progress",
          data: {
            file: data.file,
            progress: data.progress ?? 100,
            status: data.status === "progress" ? "downloading" : data.status,
          },
        })
      }
    },
  })
  currentModel = model
  console.log(`[WHISPER_WORKER] Pipeline for model ${model} successfully loaded`)
  return pipelineInstance
}

const languageMap: Record<string, string> = {
  en: "english",
  ne: "nepali",
  hi: "hindi",
  es: "spanish",
  fr: "french",
  de: "german",
  ja: "japanese",
  zh: "chinese",
}

self.onmessage = async (event: MessageEvent) => {
  const type = event.data.type
  const payload = event.data.payload
  console.log(`[WHISPER_WORKER] onmessage: received type: ${type}`)

  if (type === "preload") {
    try {
      await getPipeline(payload.model)
      console.log(`[WHISPER_WORKER] Preload successful for model: ${payload.model}`)
      self.postMessage({ type: "preload-done" })
    } catch (err: unknown) {
      console.error(`[WHISPER_WORKER] Preload failed for model: ${payload.model}`, err)
      self.postMessage({ type: "error", error: err instanceof Error ? err.message : String(err) })
    }
    return
  }

  if (type === "transcribe") {
    try {
      console.log(`[WHISPER_WORKER] Transcribing audio data (length: ${payload.audioData.length})`)
      const transcriber = (await getPipeline(payload.model)) as Function
      const options = {
        chunk_length_s: 30,
        stride_length_s: 5,
        task: "transcribe",
        language: payload.language && payload.language !== "auto"
          ? (languageMap[payload.language] ?? payload.language)
          : undefined,
        // Prevent hallucination — Nepali is often misidentified as Chinese/Urdu
        // when confidence is low. These options force the model to be conservative.
        no_speech_threshold: 0.6,
        condition_on_previous_text: false,
        compression_ratio_threshold: 2.4,
      }

      console.log("[WHISPER_WORKER] Running transcriber model inference...")
      const result = await transcriber(payload.audioData, options)
      console.log(`[WHISPER_WORKER] Inference done. Result text: "${result.text}"`)
      self.postMessage({ type: "transcribe-done", text: result.text })
    } catch (err: unknown) {
      console.error("[WHISPER_WORKER] Transcription failed:", err)
      self.postMessage({ type: "error", error: err instanceof Error ? err.message : String(err) })
    }
  }
}
