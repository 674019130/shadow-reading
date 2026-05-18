'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import SpeedControl from './SpeedControl'
import type { AudioPlayerHandle } from './AudioPlayer'

interface VideoPlayerProps {
  videoUrl: string
  onTimeUpdate?: (time: number) => void
  onReady?: (duration: number) => void
  onSeek?: (time: number) => void
}

const VideoPlayer = forwardRef<AudioPlayerHandle, VideoPlayerProps>(function VideoPlayer({
  videoUrl,
  onTimeUpdate,
  onReady,
  onSeek,
}, ref) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1.0)

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (!videoRef.current) return
      videoRef.current.currentTime = time
    },
    play: () => {
      void videoRef.current?.play()
    },
    pause: () => {
      videoRef.current?.pause()
    },
  }))

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
  }, [speed])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      void video.play()
    } else {
      video.pause()
    }
  }, [])

  const skipBack = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, video.currentTime - 5)
  }, [])

  const skipForward = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.min(video.duration || 0, video.currentTime + 5)
  }, [])

  const restart = useCallback(() => {
    if (videoRef.current) videoRef.current.currentTime = 0
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
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-inset">
        <video
          ref={videoRef}
          src={videoUrl}
          preload="metadata"
          playsInline
          className="aspect-video w-full bg-bg-inset object-contain"
          onLoadedMetadata={(event) => {
            const dur = event.currentTarget.duration || 0
            setDuration(dur)
            onReady?.(dur)
          }}
          onTimeUpdate={(event) => {
            const time = event.currentTarget.currentTime
            setCurrentTime(time)
            onTimeUpdate?.(time)
          }}
          onSeeked={(event) => {
            const time = event.currentTarget.currentTime
            setCurrentTime(time)
            onSeek?.(time)
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <button
            onClick={restart}
            className="p-2 rounded-md text-text-muted hover:text-text-secondary transition-colors"
            title="重新开始 / Restart"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={skipBack}
            className="p-2 rounded-md text-text-muted hover:text-text-secondary transition-colors"
            title="后退 5s / Back 5s"
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
            title="前进 5s / Forward 5s"
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

export default VideoPlayer
