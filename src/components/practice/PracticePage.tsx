'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Repeat, Loader2, Mic, Timer } from 'lucide-react'
import SubtitleDisplay from './SubtitleDisplay'
import RecordingPanel from './RecordingPanel'
import SessionTimer from './SessionTimer'
import AssessmentDialog from './AssessmentDialog'
import PracticeContextPanel from './PracticeContextPanel'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { PHASE_CONFIG, PHASES } from '@/lib/types'
import { getMaterial, updateMaterialPractice } from '@/lib/materials'
import { usePracticeStore } from '@/stores/practice-store'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import type { SubtitleCue, PracticePhase, Material, SessionAssessment } from '@/lib/types'
import type { AudioPlayerHandle } from './AudioPlayer'

const AudioPlayer = dynamic(() => import('./AudioPlayer'), { ssr: false })

interface PracticePageProps {
  materialId: string
}

export default function PracticePage({ materialId }: PracticePageProps) {
  const [material, setMaterial] = useState<Material | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [, setDuration] = useState(0)
  const [subtitleVisible, setSubtitleVisible] = useState(true)
  const [loopCue, setLoopCue] = useState<SubtitleCue | null>(null)
  const [showRecording, setShowRecording] = useState(false)
  const [showAssessment, setShowAssessment] = useState(false)
  const playerRef = useRef<AudioPlayerHandle>(null)

  const {
    isSessionActive,
    currentPhaseIndex,
    startSession,
    endSession,
  } = usePracticeStore()

  const currentPhase = PHASES[currentPhaseIndex] as PracticePhase

  const currentCue = useMemo(() => {
    if (!material) return null
    return material.subtitles.find(
      cue => currentTime >= cue.startTime && currentTime <= cue.endTime
    ) || null
  }, [material, currentTime])

  const nextCue = useMemo(() => {
    if (!material) return null
    const currentIndex = currentCue
      ? material.subtitles.findIndex(cue => cue.index === currentCue.index)
      : material.subtitles.findIndex(cue => cue.startTime > currentTime) - 1
    return material.subtitles[currentIndex + 1] || null
  }, [material, currentCue, currentTime])

  // Load material from DB
  useEffect(() => {
    async function load() {
      const m = await getMaterial(materialId)
      setMaterial(m || null)
      setLoading(false)
    }
    load()
  }, [materialId])

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])

  const handleReady = useCallback((dur: number) => {
    setDuration(dur)
  }, [])

  const handleCueClick = useCallback((cue: SubtitleCue) => {
    playerRef.current?.seekTo(cue.startTime)
  }, [])

  // Sentence loop
  useEffect(() => {
    if (!loopCue) return
    if (currentTime >= loopCue.endTime) {
      playerRef.current?.seekTo(loopCue.startTime)
    }
  }, [currentTime, loopCue])

  const toggleLoop = useCallback(() => {
    if (loopCue) {
      setLoopCue(null)
      return
    }
    if (!material) return
    const cue = material.subtitles.find(
      c => currentTime >= c.startTime && currentTime <= c.endTime
    )
    if (cue) setLoopCue(cue)
  }, [loopCue, material, currentTime])

  // Phase change handler — auto-toggle subtitles
  const handlePhaseChange = useCallback((phase: string) => {
    const config = PHASE_CONFIG[phase as PracticePhase]
    if (config) {
      setSubtitleVisible(config.subtitleVisible)
      // Show recording panel during record phase
      setShowRecording(phase === 'record-compare')
    }
  }, [])

  // Session complete handler
  const handleSessionComplete = useCallback(() => {
    setShowAssessment(true)
  }, [])

  // Assessment submit handler
  const handleAssessmentSubmit = useCallback(async (assessment: SessionAssessment) => {
    if (!material) return

    const store = usePracticeStore.getState()

    await db.sessions.add({
      id: nanoid(),
      materialId: material.id,
      date: new Date().toISOString().split('T')[0],
      startedAt: store.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      phases: store.phaseRecords,
      assessment,
    })

    await updateMaterialPractice(material.id)

    endSession()
    setShowAssessment(false)
    toast.success('练习已保存 / Practice session saved')
  }, [material, endSession])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.code) {
        case 'KeyS':
          e.preventDefault()
          setSubtitleVisible(v => !v)
          break
        case 'KeyL':
          e.preventDefault()
          toggleLoop()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleLoop])

  if (loading) {
    return (
      <div className="h-screen w-full bg-bg-primary flex items-center justify-center">
        <Loader2 size={20} className="text-text-muted animate-spin" />
      </div>
    )
  }

  if (!material) {
    return (
      <div className="h-screen w-full bg-bg-primary flex flex-col items-center justify-center gap-3">
        <p className="text-[14px] text-text-muted">Material not found</p>
        <Link href="/" className="text-[13px] text-accent hover:text-accent-hover transition-colors">
          返回首页 / Back to home
        </Link>
      </div>
    )
  }

  const phaseConfig = PHASE_CONFIG[currentPhase]

  return (
    <div className="h-screen w-full bg-bg-primary flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1 rounded text-text-muted hover:text-text-secondary transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <span className="text-[13px] text-text-secondary font-medium truncate max-w-[300px]">
            {material.title}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Session timer */}
          {isSessionActive ? (
            <SessionTimer
              onPhaseChange={handlePhaseChange}
              onSessionComplete={handleSessionComplete}
            />
          ) : (
            <button
              onClick={() => startSession(material.id)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-bg-card hover:bg-bg-card-hover text-[11px] text-text-secondary hover:text-text-primary transition-colors"
            >
              <Timer size={12} />
              开始练习 / Start
            </button>
          )}

          <div className="w-px h-4 bg-border" />

          {/* Recording toggle */}
          <button
            onClick={() => setShowRecording(v => !v)}
            className={`p-1 rounded transition-colors ${
              showRecording ? 'text-red' : 'text-text-muted hover:text-text-secondary'
            }`}
            title="录音面板 / Recording panel"
          >
            <Mic size={13} />
          </button>

          {/* Loop indicator */}
          <button
            onClick={toggleLoop}
            className={`p-1 rounded transition-colors ${
              loopCue ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
            }`}
            title="循环句子 / Loop sentence (L)"
          >
            <Repeat size={13} />
          </button>

          {/* Subtitle toggle */}
          <button
            onClick={() => setSubtitleVisible(!subtitleVisible)}
            className="p-1 rounded text-text-muted hover:text-text-secondary transition-colors"
            title="显示/隐藏字幕 / Toggle subtitles (S)"
          >
            {subtitleVisible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>

          <ThemeToggle />

          {/* Phase indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full phase-glow"
              style={{ background: phaseConfig.color, color: phaseConfig.color }}
            />
            <span className="text-[11px] font-medium" style={{ color: phaseConfig.color }}>
              {phaseConfig.label} / {phaseConfig.labelEn}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="grid h-full w-full max-w-[1320px] grid-cols-1 gap-8 px-6 pt-4 pb-6 mx-auto xl:grid-cols-[minmax(0,768px)_minmax(290px,360px)]">
          <div className="flex min-h-0 flex-col overflow-y-auto pb-10">
            <p className="text-[11px] text-text-muted/50 mb-4 text-center">
              {phaseConfig.description}
              <span className="block mt-1 text-text-muted/40">{phaseConfig.descriptionEn}</span>
            </p>

            <div className="mb-6">
              <AudioPlayer
                ref={playerRef}
                audioUrl={material.audioPath}
                onTimeUpdate={handleTimeUpdate}
                onReady={handleReady}
              />
            </div>

            {/* Loop indicator bar */}
            {loopCue && (
              <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-md bg-accent-soft text-[11px] text-accent">
                <Repeat size={11} />
                <span className="truncate">
                  循环 / Looping: &ldquo;{loopCue.text.slice(0, 60)}{loopCue.text.length > 60 ? '...' : ''}&rdquo;
                </span>
                <button
                  onClick={() => setLoopCue(null)}
                  className="ml-auto shrink-0 text-accent/60 hover:text-accent transition-colors"
                >
                  停止 / Stop
                </button>
              </div>
            )}

            <SubtitleDisplay
              subtitles={material.subtitles}
              currentTime={currentTime}
              visible={subtitleVisible}
              onCueClick={handleCueClick}
            />

            {/* Recording panel */}
            {showRecording && (
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <RecordingPanel originalAudioUrl={material.audioPath} />
              </div>
            )}
          </div>

          <PracticeContextPanel
            key={material.id}
            material={material}
            currentPhase={currentPhase}
            currentTime={currentTime}
            currentCue={currentCue}
            nextCue={nextCue}
            loopCue={loopCue}
            onCueClick={handleCueClick}
            onLoopCue={setLoopCue}
          />
        </div>
      </div>

      {/* Phase bar */}
      <div className="shrink-0 px-6 pb-4 pt-2">
        <div className="max-w-[1320px] mx-auto">
          <div className="flex items-center gap-2">
            {PHASES.map((phase, i) => {
              const config = PHASE_CONFIG[phase]
              const isActive = i === currentPhaseIndex
              const isPast = currentPhaseIndex > i

              return (
                <div
                  key={phase}
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                  onClick={() => {
                    if (isSessionActive) {
                      usePracticeStore.getState().skipToPhase(i)
                    }
                  }}
                >
                  <div className="flex-1 relative">
                    <div
                      className="h-[3px] rounded-full transition-all duration-300"
                      style={{
                        background: config.color,
                        opacity: isActive ? 1 : isPast ? 0.4 : 0.12,
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] shrink-0 transition-colors"
                    style={{
                      color: isActive ? config.color : 'var(--text-muted)',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {config.label}
                    <span className="ml-1 text-text-muted/70">{config.labelEn}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Assessment dialog */}
      {showAssessment && (
        <AssessmentDialog
          onSubmit={handleAssessmentSubmit}
          onClose={() => { setShowAssessment(false); endSession() }}
        />
      )}
    </div>
  )
}
