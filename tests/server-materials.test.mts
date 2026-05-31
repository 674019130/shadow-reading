import test from 'node:test'
import assert from 'node:assert/strict'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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
      mediaType: 'video',
      audioPath: '/api/materials/serve/sample.mp4',
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
    assert.equal(materials[0].mediaType, 'video')
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

test('local materials store edits material metadata and subtitle translations', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'shadow-materials-'))

  try {
    const store = createLocalMaterialsStore(rootDir)
    const material = await store.create({
      title: 'Original Title',
      difficulty: 'beginner',
      source: 'text',
      audioPath: '/api/materials/serve/original.mp3',
      duration: 12,
      subtitles: [
        {
          index: 12,
          startTime: 0,
          endTime: 4,
          text: 'Original sentence.',
        },
      ],
      tags: ['old'],
    })

    const updated = await store.update(material.id, {
      title: 'Edited Title',
      description: 'Edited description',
      difficulty: 'advanced',
      duration: 18,
      subtitles: [
        {
          index: 99,
          startTime: 0.123,
          endTime: 4.567,
          text: 'Edited sentence.',
          translation: '编辑后的句子。',
          marks: [
            { start: 0, end: 6, type: 'stress' },
            { start: 7, end: 99, type: 'fall', note: 'Drop here.' },
            { start: 4, end: 4, type: 'reduced' },
          ],
        },
      ],
      tags: ['practice', 'practice', 'edited'],
    })

    assert.equal(updated?.title, 'Edited Title')
    assert.equal(updated?.description, 'Edited description')
    assert.equal(updated?.difficulty, 'advanced')
    assert.equal(updated?.duration, 18)
    assert.deepEqual(updated?.tags, ['practice', 'edited'])
    assert.deepEqual(updated?.subtitles, [
      {
        index: 0,
        startTime: 0.12,
        endTime: 4.57,
        text: 'Edited sentence.',
        translation: '编辑后的句子。',
        marks: [
          { start: 0, end: 6, type: 'stress' },
          { start: 7, end: 16, type: 'fall', note: 'Drop here.' },
        ],
      },
    ])
    assert.equal(updated?.practiceCount, 0)
    assert.equal(updated?.createdAt, material.createdAt)
  } finally {
    await rm(rootDir, { recursive: true, force: true })
  }
})

test('local materials store duplicates material media, translations, and marks', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'shadow-materials-'))

  try {
    const materialsDir = join(rootDir, 'data', 'materials')
    await mkdir(materialsDir, { recursive: true })
    await writeFile(join(materialsDir, 'original.mp3'), 'audio bytes')

    const store = createLocalMaterialsStore(rootDir)
    const material = await store.create({
      title: 'Marked Practice',
      difficulty: 'intermediate',
      source: 'text',
      mediaType: 'audio',
      audioPath: '/api/materials/serve/original.mp3',
      duration: 20,
      subtitles: [
        {
          index: 0,
          startTime: 0,
          endTime: 4,
          text: 'Mark this phrase clearly.',
          translation: '清楚标注这个短语。',
          marks: [
            { start: 0, end: 4, type: 'stress', note: 'hit this' },
            { start: 10, end: 16, type: 'linking' },
          ],
        },
      ],
      tags: ['text', 'marked'],
    })

    const duplicate = await store.duplicate(material.id)

    assert.ok(duplicate)
    assert.notEqual(duplicate.id, material.id)
    assert.equal(duplicate.title, 'Marked Practice（副本）')
    assert.equal(duplicate.practiceCount, 0)
    assert.equal(duplicate.lastPracticedAt, undefined)
    assert.notEqual(duplicate.audioPath, material.audioPath)
    assert.match(duplicate.audioPath, /^\/api\/materials\/serve\/.+\.mp3$/)
    assert.deepEqual(duplicate.subtitles, material.subtitles)
    assert.deepEqual(duplicate.tags, material.tags)

    const copiedFilename = duplicate.audioPath.match(/\/([^/]+)$/)?.[1]
    assert.ok(copiedFilename)
    assert.equal(await readFile(join(materialsDir, copiedFilename), 'utf-8'), 'audio bytes')

    await store.remove(duplicate.id)
    await assert.rejects(access(join(materialsDir, copiedFilename)))
    assert.equal(await readFile(join(materialsDir, 'original.mp3'), 'utf-8'), 'audio bytes')
    assert.equal((await store.get(material.id))?.audioPath, '/api/materials/serve/original.mp3')
  } finally {
    await rm(rootDir, { recursive: true, force: true })
  }
})

test('local materials store exports a material bundle with media and marks', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'shadow-materials-'))

  try {
    const materialsDir = join(rootDir, 'data', 'materials')
    await mkdir(materialsDir, { recursive: true })
    await writeFile(join(materialsDir, 'export-me.mp3'), 'export audio bytes')

    const store = createLocalMaterialsStore(rootDir)
    const material = await store.create({
      title: 'Export Practice',
      difficulty: 'advanced',
      source: 'text',
      mediaType: 'audio',
      audioPath: '/api/materials/serve/export-me.mp3',
      duration: 30,
      subtitles: [
        {
          index: 0,
          startTime: 0,
          endTime: 5,
          text: 'Export the annotated sentence.',
          translation: '导出带标注的句子。',
          marks: [
            { start: 0, end: 6, type: 'fall-rise', note: 'show contrast' },
          ],
        },
      ],
      tags: ['export'],
    })

    const bundle = await store.exportMaterial(material.id)

    assert.ok(bundle)
    assert.equal(bundle.type, 'shadow-reading.material')
    assert.equal(bundle.schemaVersion, 1)
    assert.match(bundle.exportedAt, /^\d{4}-\d{2}-\d{2}T/)
    assert.deepEqual(bundle.material.subtitles, material.subtitles)
    if (!bundle.media?.embedded) assert.fail('expected embedded media')
    assert.equal(bundle.media.filename, 'export-me.mp3')
    assert.equal(bundle.media.contentType, 'audio/mpeg')
    assert.equal(bundle.media.encoding, 'base64')
    assert.equal(Buffer.from(bundle.media.data, 'base64').toString('utf-8'), 'export audio bytes')
  } finally {
    await rm(rootDir, { recursive: true, force: true })
  }
})

test('local materials store exports plain text transcript only', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'shadow-materials-'))

  try {
    const store = createLocalMaterialsStore(rootDir)
    const material = await store.create({
      title: 'Plain Text Export',
      difficulty: 'beginner',
      source: 'text',
      audioPath: '/api/materials/serve/plain.mp3',
      duration: 12,
      subtitles: [
        {
          index: 0,
          startTime: 0,
          endTime: 4,
          text: 'First sentence.',
          translation: '第一句。',
          marks: [{ start: 0, end: 5, type: 'stress', note: 'not exported as text' }],
        },
        {
          index: 1,
          startTime: 4,
          endTime: 8,
          text: ' Second sentence. ',
          translation: '第二句。',
        },
        {
          index: 2,
          startTime: 8,
          endTime: 12,
          text: '   ',
        },
      ],
      tags: ['export'],
    })

    const exported = await store.exportMaterialText(material.id)

    assert.deepEqual(exported, {
      title: 'Plain Text Export',
      text: 'First sentence.\nSecond sentence.',
    })
  } finally {
    await rm(rootDir, { recursive: true, force: true })
  }
})
