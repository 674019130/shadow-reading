import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createEstimatedSubtitleCues,
  estimateSpeechDuration,
  normalizeTextForPractice,
  splitIntoSentences,
} from '../src/lib/text-material.ts'

test('normalizes pasted text without flattening paragraph breaks', () => {
  assert.equal(
    normalizeTextForPractice('  I am learning English.  \n\n\n  It is useful. \n'),
    'I am learning English.\n\nIt is useful.'
  )
})

test('splits common English punctuation into repeatable sentences', () => {
  assert.deepEqual(
    splitIntoSentences('Good morning. How are you doing today? I am ready to practice!'),
    ['Good morning.', 'How are you doing today?', 'I am ready to practice!']
  )
})

test('creates estimated cues across the full audio duration', () => {
  const cues = createEstimatedSubtitleCues(
    'Good morning. This is a longer sentence for shadow reading practice.',
    12
  )

  assert.equal(cues.length, 2)
  assert.equal(cues[0].startTime, 0)
  assert.equal(cues.at(-1)?.endTime, 12)
  assert.ok(cues[1].startTime > cues[0].startTime)
})

test('estimates a minimum duration for very short text', () => {
  assert.equal(estimateSpeechDuration('Hello.'), 4)
})
