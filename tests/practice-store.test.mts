import test from 'node:test'
import assert from 'node:assert/strict'

import { PHASE_CONFIG, PHASES } from '../src/lib/types.ts'
import { usePracticeStore } from '../src/stores/practice-store.ts'

function resetPracticeStore() {
  usePracticeStore.setState({
    isSessionActive: false,
    materialId: null,
    currentPhaseIndex: 0,
    phaseTimeRemaining: PHASE_CONFIG[PHASES[0]].duration,
    phaseExtensionSeconds: 0,
    isTimerRunning: false,
    phaseRecords: [],
    startedAt: null,
  })
}

test('timer reaching zero leaves the learner in the current phase', () => {
  resetPracticeStore()

  const store = usePracticeStore.getState()
  store.startSession('material-1')
  usePracticeStore.setState({ phaseTimeRemaining: 1, isTimerRunning: true })

  usePracticeStore.getState().tick()

  const timedOut = usePracticeStore.getState()
  assert.equal(timedOut.currentPhaseIndex, 0)
  assert.equal(timedOut.phaseTimeRemaining, 0)
  assert.equal(timedOut.isTimerRunning, false)

  const completed = timedOut.nextPhase()
  const next = usePracticeStore.getState()
  assert.equal(completed, false)
  assert.equal(next.currentPhaseIndex, 1)
  assert.equal(next.phaseTimeRemaining, PHASE_CONFIG[PHASES[1]].duration)
})

test('learner can add one more minute to a timed-out phase', () => {
  resetPracticeStore()

  usePracticeStore.getState().startSession('material-1')
  usePracticeStore.setState({ phaseTimeRemaining: 0, isTimerRunning: false })

  usePracticeStore.getState().extendCurrentPhase(60)

  const state = usePracticeStore.getState()
  assert.equal(state.currentPhaseIndex, 0)
  assert.equal(state.phaseTimeRemaining, 60)
  assert.equal(state.isTimerRunning, false)
})
