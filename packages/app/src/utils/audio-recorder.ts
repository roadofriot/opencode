export class AudioRecorder {
  private stream: MediaStream | null = null
  private audioCtx: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private chunks: Float32Array[] = []

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    
    // Create AudioContext at 16kHz so the browser handles resampling automatically
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
    if (this.audioCtx.state === "suspended") {
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
    }

    this.source.connect(this.processor)
    this.processor.connect(this.audioCtx.destination)
  }

  async stop(): Promise<Float32Array> {
    if (!this.audioCtx || !this.processor || !this.source) {
      throw new Error("Recorder not started")
    }

    // Disconnect nodes to stop processing
    this.source.disconnect()
    this.processor.disconnect()

    // Stop all media tracks
    this.stream?.getTracks().forEach((t) => t.stop())

    // Concatenate chunks
    const totalLength = this.chunks.reduce((acc, chunk) => acc + chunk.length, 0)
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

    return audioData
  }

  cancel() {
    try {
      this.source?.disconnect()
      this.processor?.disconnect()
    } catch {}
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.audioCtx?.close()
    
    this.stream = null
    this.audioCtx = null
    this.source = null
    this.processor = null
    this.chunks = []
  }
}
