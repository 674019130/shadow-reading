'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react'
import { AudioRecorder } from '@/lib/recorder'
import { toast } from 'sonner'

interface RecordingPanelProps {
  originalAudioUrl: string
}

interface SavedRecording {
  url: string
  duration: number
  createdAt: Date
}

export default function RecordingPanel({ originalAudioUrl }: RecordingPanelProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordings, setRecordings] = useState<SavedRecording[]>([])
  const [playingOriginal, setPlayingOriginal] = useState(false)
  const [playingRecording, setPlayingRecording] = useState<number | null>(null)
  const recorderRef = useRef<AudioRecorder>(new AudioRecorder())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const originalAudioRef = useRef<HTMLAudioElement | null>(null)
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      recordings.forEach(r => URL.revokeObjectURL(r.url))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startRecording = useCallback(async () => {
    try {
      await recorderRef.current.start()
      setIsRecording(true)
      setRecordingDuration(0)
      timerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 0.1)
      }, 100)
    } catch {
      toast.error('Microphone access denied')
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    try {
      const result = await recorderRef.current.stopAsync()
      setIsRecording(false)
      setRecordings(prev => [...prev, {
        url: result.url,
        duration: result.duration,
        createdAt: new Date(),
      }])
      toast.success('Recording saved')
    } catch {
      setIsRecording(false)
    }
  }, [])

  const toggleOriginal = useCallback(() => {
    if (!originalAudioRef.current) {
      originalAudioRef.current = new Audio(originalAudioUrl)
      originalAudioRef.current.onended = () => setPlayingOriginal(false)
    }
    if (playingOriginal) {
      originalAudioRef.current.pause()
      setPlayingOriginal(false)
    } else {
      originalAudioRef.current.currentTime = 0
      originalAudioRef.current.play()
      setPlayingOriginal(true)
    }
  }, [originalAudioUrl, playingOriginal])

  const toggleRecording = useCallback((index: number) => {
    const rec = recordings[index]
    if (!rec) return

    if (playingRecording === index) {
      recordingAudioRef.current?.pause()
      setPlayingRecording(null)
      return
    }

    // Stop any playing audio
    recordingAudioRef.current?.pause()
    originalAudioRef.current?.pause()
    setPlayingOriginal(false)

    recordingAudioRef.current = new Audio(rec.url)
    recordingAudioRef.current.onended = () => setPlayingRecording(null)
    recordingAudioRef.current.play()
    setPlayingRecording(index)
  }, [recordings, playingRecording])

  const deleteRecording = useCallback((index: number) => {
    setRecordings(prev => {
      const r = prev[index]
      if (r) URL.revokeObjectURL(r.url)
      return prev.filter((_, i) => i !== index)
    })
    if (playingRecording === index) {
      recordingAudioRef.current?.pause()
      setPlayingRecording(null)
    }
  }, [playingRecording])

  // R key to toggle recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'KeyR') {
        e.preventDefault()
        if (isRecording) {
          stopRecording()
        } else {
          startRecording()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRecording, startRecording, stopRecording])

  return (
    <div className="space-y-3">
      {/* Record button area */}
      <div className="flex items-center gap-3">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-all
            ${isRecording
              ? 'bg-red/15 text-red hover:bg-red/20'
              : 'bg-bg-card hover:bg-bg-card-hover text-text-secondary hover:text-text-primary'
            }
          `}
        >
          {isRecording ? (
            <>
              <Square size={12} fill="currentColor" />
              Stop
            </>
          ) : (
            <>
              <Mic size={14} />
              Record
            </>
          )}
          <span className="text-[10px] text-text-muted ml-1">R</span>
        </button>

        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
            <span className="text-[12px] font-mono text-text-muted tabular-nums">
              {formatRecTime(recordingDuration)}
            </span>
          </div>
        )}

        {/* Play original for comparison */}
        {recordings.length > 0 && !isRecording && (
          <button
            onClick={toggleOriginal}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] transition-colors
              ${playingOriginal
                ? 'bg-accent-soft text-accent'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-card'
              }
            `}
          >
            {playingOriginal ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
            Original
          </button>
        )}
      </div>

      {/* Recordings list */}
      {recordings.length > 0 && (
        <div className="space-y-1">
          {recordings.map((rec, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-2 px-3 -mx-3 rounded-md hover:bg-bg-card/50 group transition-colors"
            >
              <button
                onClick={() => toggleRecording(i)}
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0
                  ${playingRecording === i
                    ? 'bg-accent text-bg-primary'
                    : 'bg-bg-card text-text-muted hover:text-text-primary'
                  }
                `}
              >
                {playingRecording === i ? <Pause size={11} /> : <Play size={11} className="ml-0.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <span className="text-[12px] text-text-secondary">
                  Recording {i + 1}
                </span>
                <span className="text-[11px] text-text-muted ml-2 font-mono tabular-nums">
                  {formatRecTime(rec.duration)}
                </span>
              </div>

              <button
                onClick={() => deleteRecording(i)}
                className="p-1 rounded text-text-muted/0 group-hover:text-text-muted hover:!text-red transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatRecTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
