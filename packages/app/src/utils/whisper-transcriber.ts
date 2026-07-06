import WhisperWorkerUrl from "./whisper.worker.ts?worker&url"

export type DownloadProgress = {
  file: string
  progress: number
  status: "initiate" | "downloading" | "done"
}

export class WhisperTranscriber {
  private static worker: Worker | null = null
  private static onProgressCallbacks = new Set<(progress: DownloadProgress) => void>()
  private static activePreloadPromise: { resolve: () => void; reject: (err: Error) => void } | null = null
  private static activeTranscribePromise: { resolve: (text: string) => void; reject: (err: Error) => void } | null = null
  // Track which models have been successfully loaded to avoid re-downloading on each mic press
  private static loadedModels = new Set<string>()

  static isModelLoaded(model: string): boolean {
    return this.loadedModels.has(model)
  }

  static subscribeProgress(cb: (progress: DownloadProgress) => void) {
    this.onProgressCallbacks.add(cb)
    return () => this.onProgressCallbacks.delete(cb)
  }

  private static notifyProgress(progress: DownloadProgress) {
    for (const cb of this.onProgressCallbacks) {
      cb(progress)
    }
  }

  private static getWorker(): Worker {
    if (this.worker) return this.worker

    console.log("[WHISPER] Initializing new Whisper worker...")
    this.worker = new Worker(WhisperWorkerUrl, { type: "module" })
    this.worker.onmessage = (event: MessageEvent) => {
      const type = event.data.type
      console.log(`[WHISPER] Worker message received: ${type}`, event.data)

      if (type === "progress") {
        this.notifyProgress(event.data.data)
        return
      }

      if (type === "preload-done") {
        console.log("[WHISPER] Preload complete")
        if (this.activePreloadPromise) {
          this.activePreloadPromise.resolve()
          this.activePreloadPromise = null
        }
        return
      }

      if (type === "transcribe-done") {
        console.log(`[WHISPER] Transcription complete! Text: "${event.data.text}"`)
        if (this.activeTranscribePromise) {
          this.activeTranscribePromise.resolve(event.data.text)
          this.activeTranscribePromise = null
        }
        return
      }

      if (type === "error") {
        console.error("[WHISPER] Worker returned an error:", event.data.error)
        const err = new Error(event.data.error || "Worker error")
        if (this.activePreloadPromise) {
          this.activePreloadPromise.reject(err)
          this.activePreloadPromise = null
        }
        if (this.activeTranscribePromise) {
          this.activeTranscribePromise.reject(err)
          this.activeTranscribePromise = null
        }
      }
    }

    this.worker.onerror = (e) => {
      console.error("[WHISPER] Worker onerror triggered:", e)
      const err = new Error(e.message || "Whisper worker failed")
      if (this.activePreloadPromise) {
        this.activePreloadPromise.reject(err)
        this.activePreloadPromise = null
      }
      if (this.activeTranscribePromise) {
        this.activeTranscribePromise.reject(err)
        this.activeTranscribePromise = null
      }
    }

    return this.worker
  }

  static async preloadModel(model: string): Promise<void> {
    // Skip if already loaded — avoids re-downloading on every mic press
    if (this.loadedModels.has(model)) {
      console.log(`[WHISPER] Model already loaded: ${model}, skipping preload`)
      return
    }

    console.log(`[WHISPER] Requesting model preload for: ${model}`)
    const worker = this.getWorker()
    if (this.activePreloadPromise) {
      console.warn("[WHISPER] Preload already in progress!")
      throw new Error("A model preload is already in progress")
    }
    return new Promise<void>((resolve, reject) => {
      this.activePreloadPromise = {
        resolve: () => {
          this.loadedModels.add(model)
          resolve()
        },
        reject,
      }
      worker.postMessage({ type: "preload", payload: { model } })
    })
  }

  static async transcribe(audioData: Float32Array, model: string, language: string): Promise<string> {
    if (audioData.length === 0) {
      throw new Error("No audio was captured. Please try speaking again.")
    }
    console.log(`[WHISPER] Requesting transcription. Model: ${model}, Language: ${language}, Audio sample length: ${audioData.length}`)
    const worker = this.getWorker()
    if (this.activeTranscribePromise) {
      console.warn("[WHISPER] Transcription already in progress!")
      throw new Error("A transcription is already in progress")
    }
    return new Promise<string>((resolve, reject) => {
      this.activeTranscribePromise = { resolve, reject }
      worker.postMessage(
        { type: "transcribe", payload: { audioData, model, language } },
        [audioData.buffer]
      )
    })
  }
}
