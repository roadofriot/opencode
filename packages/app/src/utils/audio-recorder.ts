export class AudioRecorder {
  private stream: MediaStream | null = null
  private audioCtx: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private chunks: Float32Array[] = []

  async start() {
    console.log("[VOICE] Starting audio recording...")
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    console.log("[VOICE] MediaStream acquired")
    
    // Create AudioContext at 16kHz so the browser handles resampling automatically
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
    if (this.audioCtx.state === "suspended") {
      console.log("[VOICE] Resuming AudioContext")
      await this.audioCtx.resume()
    }
    this.source = this.audioCtx.createMediaStreamSource(this.stream)
    
    // Buffer size of 4096, 1 input channel, 1 output channel
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1)
    
    this.chunks = []
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0)
      // Must clone the data because the browser reuses the input buffer!
      this.chunks.push(new Float32Array(inputData))
      if (this.chunks.length % 20 === 0) {
        console.log(`[VOICE] Recorded ${this.chunks.length} chunks so far`)
      }
    }

    this.source.connect(this.processor)
    this.processor.connect(this.audioCtx.destination)
    console.log("[VOICE] Audio recording pipeline connected")
  }

  async stop(): Promise<Float32Array> {
    console.log("[VOICE] Stopping audio recording...")
    if (!this.audioCtx || !this.processor || !this.source) {
      console.error("[VOICE] Stop called but recorder not started")
      throw new Error("Recorder not started")
    }

    // Disconnect nodes to stop processing
    this.source.disconnect()
    this.processor.disconnect()

    // Stop all media tracks
    this.stream?.getTracks().forEach((t) => t.stop())

    // Concatenate chunks
    const totalLength = this.chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    console.log(`[VOICE] Concatenating ${this.chunks.length} chunks, total length: ${totalLength}`)
    const audioData = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of this.chunks) {
      audioData.set(chunk, offset)
      offset += chunk.length
    }

    // Close AudioContext
    await this.audioCtx.close()

    this.stream = null
    this.audioCtx = null
    this.source = null
    this.processor = null
    this.chunks = []

    console.log("[VOICE] Audio recording stopped, returning Float32Array data")
    return audioData
  }

  cancel() {
    console.log("[VOICE] Cancelling audio recording")
    try {
      this.source?.disconnect()
      this.processor?.disconnect()
    } catch (err) {
      console.error("[VOICE] Error during disconnect on cancel:", err)
    }
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.audioCtx?.close()
    
    this.stream = null
    this.audioCtx = null
    this.source = null
    this.processor = null
    this.chunks = []
  }
}
