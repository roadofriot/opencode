export class AudioRecorder {
  private stream: MediaStream | null = null
  private audioCtx: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private chunks: Float32Array[] = []
  private workletNode: AudioWorkletNode | null = null
  private workletPort: MessagePort | null = null

  async start() {
    console.log("[VOICE] Starting audio recording...")
    this.stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }, 
      video: false 
    })
    console.log("[VOICE] MediaStream acquired")
    
    // Create AudioContext - let browser handle sample rate
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (this.audioCtx.state === "suspended") {
      console.log("[VOICE] Resuming AudioContext")
      await this.audioCtx.resume()
    }
    
    // Try AudioWorklet first (modern approach), fallback to ScriptProcessorNode
    try {
      await this.startWorkletRecording()
    } catch (err) {
      console.warn("[VOICE] AudioWorklet failed, falling back to ScriptProcessorNode:", err)
      await this.startScriptProcessorRecording()
    }
  }

  private async startWorkletRecording() {
    if (!this.audioCtx) throw new Error("AudioContext not initialized")
    
    // Create inline worklet module to avoid separate file
    const workletCode = `
      class AudioRecorderProcessor extends AudioWorkletProcessor {
        constructor() {
          super()
          this.chunks = []
          this.port.onmessage = (event) => {
            if (event.data.type === 'getChunks') {
              this.port.postMessage({ type: 'chunks', chunks: this.chunks })
              this.chunks = []
            }
          }
        }

        process(inputs, _outputs, _parameters) {
          const input = inputs[0]
          if (input.length > 0) {
            this.chunks.push(new Float32Array(input[0]))
          }
          return true
        }
      }
      registerProcessor('audio-recorder-processor', AudioRecorderProcessor)
    `
    
    const blob = new Blob([workletCode], { type: 'application/javascript' })
    const workletUrl = URL.createObjectURL(blob)
    
    try {
      await this.audioCtx.audioWorklet.addModule(workletUrl)
    } catch (err) {
      console.error("[VOICE] Failed to load AudioWorklet module:", err)
      throw err
    } finally {
      URL.revokeObjectURL(workletUrl)
    }

    this.source = this.audioCtx.createMediaStreamSource(this.stream!)
    this.workletNode = new AudioWorkletNode(this.audioCtx, 'audio-recorder-processor')
    
    this.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'chunks') {
        this.chunks.push(...event.data.chunks)
        if (this.chunks.length % 20 === 0) {
          console.log(`[VOICE] Recorded ${this.chunks.length} chunks so far (worklet)`)
        }
      }
    }
    
    this.workletPort = this.workletNode.port
    this.source.connect(this.workletNode)
    // Don't connect to destination to avoid feedback
    
    console.log("[VOICE] AudioWorklet recording pipeline connected")
  }

  private startScriptProcessorRecording() {
    if (!this.audioCtx || !this.stream) throw new Error("AudioContext or stream not initialized")
    
    this.source = this.audioCtx.createMediaStreamSource(this.stream)
    
    // Buffer size of 4096, 1 input channel, 1 output channel
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1)
    
    this.chunks = []
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0)
      // Must clone the data because the browser reuses the input buffer!
      this.chunks.push(new Float32Array(inputData))
      if (this.chunks.length % 20 === 0) {
        console.log(`[VOICE] Recorded ${this.chunks.length} chunks so far (script)`)
      }
    }

    this.source.connect(this.processor)
    this.processor.connect(this.audioCtx.destination)
    console.log("[VOICE] ScriptProcessor recording pipeline connected (deprecated but functional)")
  }

  async stop(): Promise<Float32Array> {
    console.log("[VOICE] Stopping audio recording...")
    
    // Get remaining chunks from worklet before disconnecting
    if (this.workletPort) {
      try {
        await new Promise<void>((resolve) => {
          this.workletPort!.onmessage = (event) => {
            if (event.data.type === 'chunks') {
              this.chunks.push(...event.data.chunks)
              resolve()
            }
          }
          this.workletPort!.postMessage({ type: 'getChunks' })
        })
      } catch (err) {
        console.warn("[VOICE] Error getting worklet chunks:", err)
      }
    }
    
    if (!this.audioCtx) {
      console.error("[VOICE] Stop called but recorder not started")
      throw new Error("Recorder not started")
    }

    // Disconnect nodes to stop processing
    this.source?.disconnect()
    this.processor?.disconnect()
    this.workletNode?.disconnect()
    // Stop all media tracks
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null

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
      this.workletNode?.disconnect()
    } catch (err) {
      console.error("[VOICE] Error during disconnect on cancel:", err)
    }
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.audioCtx?.close()
    
    this.stream = null
    this.audioCtx = null
    this.source = null
    this.processor = null
    this.workletNode = null
    this.workletPort = null
    this.chunks = []
  }
}
