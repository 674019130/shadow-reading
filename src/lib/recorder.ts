export interface RecorderState {
  isRecording: boolean
  duration: number
  blob: Blob | null
  url: string | null
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private startTime = 0
  private stream: MediaStream | null = null

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // Pick best supported format
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
      .find(m => MediaRecorder.isTypeSupported(m)) || ''

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType })
    this.chunks = []
    this.startTime = Date.now()

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }

    this.mediaRecorder.start(100) // collect data every 100ms
  }

  stop(): { blob: Blob; url: string; duration: number } {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) throw new Error('Not recording')

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder!.mimeType })
        const url = URL.createObjectURL(blob)
        const duration = (Date.now() - this.startTime) / 1000

        // Stop all tracks
        this.stream?.getTracks().forEach(t => t.stop())
        this.stream = null
        this.mediaRecorder = null
        this.chunks = []

        resolve({ blob, url, duration })
      }

      this.mediaRecorder.stop()
    }) as unknown as { blob: Blob; url: string; duration: number }
  }

  // For async stop
  async stopAsync(): Promise<{ blob: Blob; url: string; duration: number }> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) throw new Error('Not recording')

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder!.mimeType })
        const url = URL.createObjectURL(blob)
        const duration = (Date.now() - this.startTime) / 1000

        this.stream?.getTracks().forEach(t => t.stop())
        this.stream = null
        this.mediaRecorder = null
        this.chunks = []

        resolve({ blob, url, duration })
      }

      this.mediaRecorder.stop()
    })
  }

  getStream(): MediaStream | null {
    return this.stream
  }

  isActive(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }
}
