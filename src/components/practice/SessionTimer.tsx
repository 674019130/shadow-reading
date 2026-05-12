'use client'

import { useEffect } from 'react'
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react'
import { usePracticeStore } from '@/stores/practice-store'
import { PHASE_CONFIG, PHASES } from '@/lib/types'

interface SessionTimerProps {
  onPhaseChange?: (phase: string) => void
  onNextPhase?: () => void
}

export default function SessionTimer({ onPhaseChange, onNextPhase }: SessionTimerProps) {
  const {
    isSessionActive,
    currentPhaseIndex,
    phaseTimeRemaining,
    phaseExtensionSeconds,
    isTimerRunning,
    previousPhase,
    toggleTimer,
    tick,
  } = usePracticeStore()

  const currentPhase = PHASES[currentPhaseIndex]
  const config = PHASE_CONFIG[currentPhase]

  // Timer tick
  useEffect(() => {
    if (!isTimerRunning || !isSessionActive) return
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isTimerRunning, isSessionActive, tick])

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChange?.(currentPhase)
  }, [currentPhase, onPhaseChange])

  if (!isSessionActive) return null

  const minutes = Math.floor(phaseTimeRemaining / 60)
  const seconds = phaseTimeRemaining % 60
  const totalPhaseTime = config.duration + phaseExtensionSeconds
  const progress = totalPhaseTime > 0 ? 1 - phaseTimeRemaining / totalPhaseTime : 1
  const isTimeUp = phaseTimeRemaining <= 0

  return (
    <div className="flex items-center gap-3">
      {/* Previous phase */}
      <button
        onClick={previousPhase}
        disabled={currentPhaseIndex === 0}
        className="p-1 rounded text-text-muted hover:text-text-secondary disabled:opacity-30 transition-colors"
      >
        <SkipBack size={12} />
      </button>

      {/* Timer display */}
      <button
        onClick={toggleTimer}
        disabled={isTimeUp}
        className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-bg-card/50 disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
      >
        {isTimerRunning && !isTimeUp ? (
          <Pause size={11} style={{ color: config.color }} />
        ) : (
          <Play size={11} className="ml-0.5" style={{ color: config.color }} />
        )}
        <span className="text-[13px] font-mono tabular-nums" style={{ color: config.color }}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </button>

      {/* Progress ring */}
      <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0 -rotate-90">
        <circle
          cx="10" cy="10" r="8"
          fill="none"
          stroke="var(--border)"
          strokeWidth="2"
        />
        <circle
          cx="10" cy="10" r="8"
          fill="none"
          stroke={config.color}
          strokeWidth="2"
          strokeDasharray={`${2 * Math.PI * 8}`}
          strokeDashoffset={`${2 * Math.PI * 8 * (1 - progress)}`}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>

      {/* Next phase */}
      <button
        onClick={onNextPhase}
        className="p-1 rounded text-text-muted hover:text-text-secondary disabled:opacity-30 transition-colors"
      >
        <SkipForward size={12} />
      </button>
    </div>
  )
}
