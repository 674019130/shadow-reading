import test from 'node:test'
import assert from 'node:assert/strict'

import { createSentenceLoopRange } from '../src/lib/loop-range.ts'
import type { SubtitleCue } from '../src/lib/types.ts'

const cue: SubtitleCue = {
  index: 2,
  startTime: 10,
  endTime: 12,
  text: 'This sentence needs a cleaner loop.',
}

test('sentence loop adds small lead-in and tail room around subtitle cues', () => {
  assert.deepEqual(createSentenceLoopRange(cue, 30), {
    startTime: 9.65,
    endTime: 12.45,
  })
})

test('sentence loop range stays inside the audio duration', () => {
  assert.deepEqual(
    createSentenceLoopRange({ ...cue, startTime: 0.1, endTime: 1.1 }, 1.35),
    {
      startTime: 0,
      endTime: 1.35,
    }
  )
})

test('sentence loop range tolerates bad cue timing without seeking past duration', () => {
  assert.deepEqual(
    createSentenceLoopRange({ ...cue, startTime: 8, endTime: 7.5 }, 8.2),
    {
      startTime: 7.65,
      endTime: 8.2,
    }
  )
})
