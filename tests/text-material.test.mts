import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createEstimatedSubtitleCues,
  createEstimatedSubtitleCuesFromSentences,
  estimateSpeechDuration,
  normalizeTextForPractice,
  splitIntoSentences,
} from '../src/lib/text-material.ts'
import { raceEnglishToChinese } from '../src/lib/free-translation.ts'

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

test('keeps common English abbreviations inside the same sentence', () => {
  assert.deepEqual(
    splitIntoSentences('Mr. Smith lives in the U.S. I use e.g. examples. Are you ready?'),
    ['Mr. Smith lives in the U.S.', 'I use e.g. examples.', 'Are you ready?']
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

test('creates estimated cues from manually confirmed sentence units', () => {
  const cues = createEstimatedSubtitleCuesFromSentences(
    ['I build backend systems', 'and I improve them in production.'],
    8,
    ['我构建后端系统', '并在生产环境中持续改进。']
  )

  assert.equal(cues.length, 2)
  assert.equal(cues[0].text, 'I build backend systems')
  assert.equal(cues[0].translation, '我构建后端系统')
  assert.equal(cues[1].text, 'and I improve them in production.')
})

test('attaches sentence translations to estimated cues', () => {
  const cues = createEstimatedSubtitleCues(
    'Good morning. I am ready to practice.',
    8,
    ['早上好。', '我准备好练习了。']
  )

  assert.equal(cues[0].translation, '早上好。')
  assert.equal(cues[1].translation, '我准备好练习了。')
})

test('estimates a minimum duration for very short text', () => {
  assert.equal(estimateSpeechDuration('Hello.'), 4)
})

test('uses the first useful free translation result', async () => {
  const result = await raceEnglishToChinese('Hello.', [
    {
      id: 'mymemory',
      translate: async () => null,
    },
    {
      id: 'libretranslate',
      translate: async () => '你好。',
    },
  ])

  assert.deepEqual(result, {
    provider: 'libretranslate',
    text: '你好。',
  })
})
