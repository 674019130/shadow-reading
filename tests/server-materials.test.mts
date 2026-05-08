import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { createLocalMaterialsStore } from '../src/lib/server-materials.ts'

test('local materials store persists material records on disk', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'shadow-materials-'))

  try {
    const store = createLocalMaterialsStore(rootDir)
    const material = await store.create({
      title: 'Daily Shadowing Sample',
      difficulty: 'beginner',
      source: 'local',
      audioPath: '/api/materials/serve/sample.mp3',
      duration: 36,
      subtitles: [
        {
          index: 0,
          startTime: 0,
          endTime: 4,
          text: 'Good morning.',
        },
      ],
      tags: ['sample'],
    })

    const freshStore = createLocalMaterialsStore(rootDir)
    const materials = await freshStore.list()

    assert.equal(materials.length, 1)
    assert.equal(materials[0].id, material.id)
    assert.equal(materials[0].title, 'Daily Shadowing Sample')
    assert.equal(materials[0].practiceCount, 0)
  } finally {
    await rm(rootDir, { recursive: true, force: true })
  }
})

test('local materials store updates and removes records', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'shadow-materials-'))

  try {
    const store = createLocalMaterialsStore(rootDir)
    const material = await store.create({
      title: 'Review Sentence',
      difficulty: 'intermediate',
      source: 'local',
      audioPath: '/api/materials/serve/review.mp3',
      duration: 12,
      subtitles: [],
      tags: [],
    })

    await store.incrementPracticeCount(material.id)
    const practiced = await store.get(material.id)

    assert.equal(practiced?.practiceCount, 1)
    assert.match(practiced?.lastPracticedAt ?? '', /^\d{4}-\d{2}-\d{2}T/)

    await store.remove(material.id)
    assert.equal(await store.get(material.id), undefined)
    assert.deepEqual(await store.list(), [])
  } finally {
    await rm(rootDir, { recursive: true, force: true })
  }
})
