import { env, pipeline } from "@xenova/transformers"

// Force Hugging Face CDN since we run entirely client-side
env.allowLocalModels = false

let pipelineInstance: any = null
let currentModel: string | null = null

export type DownloadProgress = {
  file: string
  progress: number
  status: "initiate" | "downloading" | "done"
}

export class WhisperTranscriber {
  private static onProgressCallbacks = new Set<(progress: DownloadProgress) => void>()

  static subscribeProgress(cb: (progress: DownloadProgress) => void) {
    this.onProgressCallbacks.add(cb)
    return () => this.onProgressCallbacks.delete(cb)
  }

  private static notifyProgress(progress: DownloadProgress) {
    for (const cb of this.onProgressCallbacks) {
      cb(progress)
    }
  }

  static async getPipeline(model: string) {
    if (pipelineInstance && currentModel === model) {
      return pipelineInstance
    }

    pipelineInstance = await pipeline("automatic-speech-recognition", model, {
      progress_callback: (data: any) => {
        if (data.status === "initiate" || data.status === "progress" || data.status === "done") {
          this.notifyProgress({
            file: data.file,
            progress: data.progress ?? 100,
            status: data.status === "progress" ? "downloading" : data.status,
          })
        }
      },
    })
    currentModel = model
    return pipelineInstance
  }

  static async preloadModel(model: string) {
    await this.getPipeline(model)
  }

  static async transcribe(audioData: Float32Array, model: string, language: string): Promise<string> {
    const transcriber = await this.getPipeline(model)
    const options: any = {
      chunk_length_s: 30,
      stride_length_s: 5,
      task: "transcribe",
    }

    if (language && language !== "auto") {
      options.language = language === "ne" ? "nepali" : "english"
    }

    const result = await transcriber(audioData, options)
    return result.text
  }
}
