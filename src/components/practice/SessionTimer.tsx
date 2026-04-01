'use client'

import { useEffect } from 'react'
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react'
import { usePracticeStore } from '@/stores/practice-store'
import { PHASE_CONFIG, PHASES } from '@/lib/types'

interface SessionTimerProps {
  onPhaseChange?: (phase: string) => void
  onSessionComplete?: () => void
}

export default function SessionTimer({ onPhaseChange, onSessionComplete }: SessionTimerProps) {
  const {
    isSessionActive,
    currentPhaseIndex,
    phaseTimeRemaining,
    isTimerRunning,
    nextPhase,
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

  // Auto-advance when time is up
  useEffect(() => {
    if (phaseTimeRemaining <= 0 && isSessionActive) {
      const isComplete = nextPhase()
      if (isComplete) {
        onSessionComplete?.()
      }
    }
  }, [phaseTimeRemaining, isSessionActive, nextPhase, onSessionComplete])

  if (!isSessionActive) return null

  const minutes = Math.floor(phaseTimeRemaining / 60)
  const seconds = phaseTimeRemaining % 60
  const progress = 1 - phaseTimeRemaining / config.duration

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
        className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-bg-card/50 transition-colors"
      >
        {isTimerRunning ? (
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
        onClick={() => {
          const isComplete = nextPhase()
          if (isComplete) onSessionComplete?.()
        }}
        disabled={currentPhaseIndex === PHASES.length - 1 && phaseTimeRemaining > 0}
        className="p-1 rounded text-text-muted hover:text-text-secondary disabled:opacity-30 transition-colors"
      >
        <SkipForward size={12} />
      </button>
    </div>
  )
}
