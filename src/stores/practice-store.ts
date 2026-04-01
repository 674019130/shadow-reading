import { create } from 'zustand'
import type { PracticePhase, PhaseRecord, SessionAssessment } from '@/lib/types'
import { PHASE_CONFIG, PHASES } from '@/lib/types'

interface PracticeStore {
  // Session state
  isSessionActive: boolean
  materialId: string | null
  currentPhaseIndex: number
  phaseTimeRemaining: number
  isTimerRunning: boolean
  phaseRecords: PhaseRecord[]
  startedAt: string | null

  // Computed
  currentPhase: PracticePhase

  // Actions
  startSession: (materialId: string) => void
  endSession: () => void
  nextPhase: () => boolean
  previousPhase: () => void
  skipToPhase: (index: number) => void
  toggleTimer: () => void
  tick: () => void
}

export const usePracticeStore = create<PracticeStore>((set, get) => ({
  isSessionActive: false,
  materialId: null,
  currentPhaseIndex: 0,
  phaseTimeRemaining: PHASE_CONFIG[PHASES[0]].duration,
  isTimerRunning: false,
  phaseRecords: [],
  startedAt: null,

  get currentPhase() {
    return PHASES[get().currentPhaseIndex]
  },

  startSession: (materialId: string) => {
    set({
      isSessionActive: true,
      materialId,
      currentPhaseIndex: 0,
      phaseTimeRemaining: PHASE_CONFIG[PHASES[0]].duration,
      isTimerRunning: false,
      phaseRecords: [],
      startedAt: new Date().toISOString(),
    })
  },

  endSession: () => {
    set({
      isSessionActive: false,
      isTimerRunning: false,
    })
  },

  nextPhase: () => {
    const state = get()
    const nextIndex = state.currentPhaseIndex + 1

    // Record current phase
    const currentPhase = PHASES[state.currentPhaseIndex]
    const totalTime = PHASE_CONFIG[currentPhase].duration
    const record: PhaseRecord = {
      phase: currentPhase,
      duration: totalTime - state.phaseTimeRemaining,
      completedAt: new Date().toISOString(),
    }

    if (nextIndex >= PHASES.length) {
      // Session complete
      set({
        phaseRecords: [...state.phaseRecords, record],
        isTimerRunning: false,
      })
      return true // signals completion
    }

    const nextPhaseName = PHASES[nextIndex]
    set({
      currentPhaseIndex: nextIndex,
      phaseTimeRemaining: PHASE_CONFIG[nextPhaseName].duration,
      phaseRecords: [...state.phaseRecords, record],
      isTimerRunning: false,
    })
    return false
  },

  previousPhase: () => {
    const state = get()
    if (state.currentPhaseIndex <= 0) return
    const prevIndex = state.currentPhaseIndex - 1
    const prevPhase = PHASES[prevIndex]
    set({
      currentPhaseIndex: prevIndex,
      phaseTimeRemaining: PHASE_CONFIG[prevPhase].duration,
      isTimerRunning: false,
    })
  },

  skipToPhase: (index: number) => {
    if (index < 0 || index >= PHASES.length) return
    const phase = PHASES[index]
    set({
      currentPhaseIndex: index,
      phaseTimeRemaining: PHASE_CONFIG[phase].duration,
      isTimerRunning: false,
    })
  },

  toggleTimer: () => {
    set(state => ({ isTimerRunning: !state.isTimerRunning }))
  },

  tick: () => {
    const state = get()
    if (!state.isTimerRunning) return

    const newTime = state.phaseTimeRemaining - 1
    if (newTime <= 0) {
      // Phase time up — auto-advance
      set({ phaseTimeRemaining: 0, isTimerRunning: false })
    } else {
      set({ phaseTimeRemaining: newTime })
    }
  },
}))
