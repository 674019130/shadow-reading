'use client'

import { useRef, useCallback, useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
} from 'lucide-react'
import SpeedControl from './SpeedControl'

export interface AudioPlayerHandle {
  seekTo: (time: number) => void
  play: () => void
  pause: () => void
}

interface AudioPlayerProps {
  audioUrl: string
  onTimeUpdate?: (time: number) => void
  onReady?: (duration: number) => void
  onSeek?: (time: number) => void
}

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(function AudioPlayer({
  audioUrl,
  onTimeUpdate,
  onReady,
  onSeek,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1.0)

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => wavesurferRef.current?.setTime(time),
    play: () => wavesurferRef.current?.play(),
    pause: () => wavesurferRef.current?.pause(),
  }))

  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'var(--wave-color)',
      progressColor: 'var(--wave-progress)',
      cursorColor: 'var(--wave-cursor)',
      cursorWidth: 1,
      height: 64,
      barWidth: 2,
      barGap: 2,
      barRadius: 1,
      normalize: true,
      backend: 'WebAudio',
    })

    ws.on('ready', () => {
      const dur = ws.getDuration()
      setDuration(dur)
      onReady?.(dur)
    })

    ws.on('audioprocess', () => {
      const time = ws.getCurrentTime()
      setCurrentTime(time)
      onTimeUpdate?.(time)
    })

    ws.on('seeking', () => {
      const time = ws.getCurrentTime()
      setCurrentTime(time)
      onSeek?.(time)
    })

    ws.on('play', () => setIsPlaying(true))
    ws.on('pause', () => setIsPlaying(false))
    ws.on('finish', () => setIsPlaying(false))

    ws.load(audioUrl)
    wavesurferRef.current = ws

    return () => {
      ws.destroy()
      wavesurferRef.current = null
    }
  }, [audioUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    wavesurferRef.current?.setPlaybackRate(speed)
  }, [speed])

  const togglePlay = useCallback(() => {
    wavesurferRef.current?.playPause()
  }, [])

  const skipBack = useCallback(() => {
    const ws = wavesurferRef.current
    if (!ws) return
    ws.setTime(Math.max(0, ws.getCurrentTime() - 5))
  }, [])

  const skipForward = useCallback(() => {
    const ws = wavesurferRef.current
    if (!ws) return
    ws.setTime(Math.min(ws.getDuration(), ws.getCurrentTime() + 5))
  }, [])

  const restart = useCallback(() => {
    wavesurferRef.current?.setTime(0)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipBack()
          break
        case 'ArrowRight':
          e.preventDefault()
          skipForward()
          break
        case 'ArrowUp':
          e.preventDefault()
          setSpeed(prev => {
            const speeds = [0.5, 0.75, 1.0, 1.25, 1.5]
            const idx = speeds.indexOf(prev)
            return idx < speeds.length - 1 ? speeds[idx + 1] : prev
          })
          break
        case 'ArrowDown':
          e.preventDefault()
          setSpeed(prev => {
            const speeds = [0.5, 0.75, 1.0, 1.25, 1.5]
            const idx = speeds.indexOf(prev)
            return idx > 0 ? speeds[idx - 1] : prev
          })
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, skipBack, skipForward])

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="rounded-lg bg-bg-inset px-3 py-4 cursor-pointer"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <button
            onClick={restart}
            className="p-2 rounded-md text-text-muted hover:text-text-secondary transition-colors"
            title="重新开始"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={skipBack}
            className="p-2 rounded-md text-text-muted hover:text-text-secondary transition-colors"
            title="后退 5s"
          >
            <SkipBack size={14} />
          </button>
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-accent/90 hover:bg-accent text-bg-primary flex items-center justify-center transition-all mx-1"
            title="Space"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>
          <button
            onClick={skipForward}
            className="p-2 rounded-md text-text-muted hover:text-text-secondary transition-colors"
            title="前进 5s"
          >
            <SkipForward size={14} />
          </button>
        </div>

        <div className="text-[12px] font-mono text-text-muted tabular-nums">
          {formatTime(currentTime)}
          <span className="text-text-muted/40 mx-1">/</span>
          {formatTime(duration)}
        </div>

        <SpeedControl speed={speed} onSpeedChange={setSpeed} />
      </div>
    </div>
  )
})

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default AudioPlayer
export { formatTime }
