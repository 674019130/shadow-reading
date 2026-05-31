import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { nanoid } from 'nanoid'
import type { DifficultyLevel, Material, MaterialSource, MediaType, SubtitleCue } from './types'

export interface CreateMaterialData {
  title: string
  difficulty: DifficultyLevel
  source: MaterialSource
  mediaType?: MediaType
  audioPath: string
  duration: number
  subtitles: SubtitleCue[]
  description?: string
  youtubeUrl?: string
  tags?: string[]
}

export interface UpdateMaterialData {
  title?: string
  description?: string
  difficulty?: DifficultyLevel
  audioPath?: string
  duration?: number
  subtitles?: SubtitleCue[]
  tags?: string[]
}

export interface ExportedMaterialBundle {
  type: 'shadow-reading.material'
  schemaVersion: 1
  exportedAt: string
  material: Material
  media?: {
    embedded: true
    filename: string
    contentType: string
    encoding: 'base64'
    data: string
  } | {
    embedded: false
    path: string
  }
}

export interface ExportedMaterialText {
  title: string
  text: string
}

interface MaterialIndex {
  version: 1
  materials: Material[]
}

interface LocalMaterialsStore {
  list: () => Promise<Material[]>
  get: (id: string) => Promise<Material | undefined>
  create: (data: CreateMaterialData) => Promise<Material>
  update: (id: string, data: UpdateMaterialData) => Promise<Material | undefined>
  duplicate: (id: string) => Promise<Material | undefined>
  exportMaterial: (id: string) => Promise<ExportedMaterialBundle | undefined>
  exportMaterialText: (id: string) => Promise<ExportedMaterialText | undefined>
  remove: (id: string) => Promise<void>
  incrementPracticeCount: (id: string) => Promise<void>
  ensureBuiltinMaterial: () => Promise<void>
}

const INDEX_FILENAME = 'index.json'
const BUILTIN_MATERIAL_ID = 'builtin-julian-treasure'

export function createLocalMaterialsStore(rootDir = process.cwd()): LocalMaterialsStore {
  const materialsDir = join(rootDir, 'data', 'materials')
  const indexPath = join(materialsDir, INDEX_FILENAME)

  async function readIndex(): Promise<MaterialIndex> {
    try {
      const content = await readFile(indexPath, 'utf-8')
      const parsed = JSON.parse(content) as Partial<MaterialIndex>
      return {
        version: 1,
        materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return { version: 1, materials: [] }
      }
      throw error
    }
  }

  async function writeIndex(index: MaterialIndex): Promise<void> {
    await mkdir(materialsDir, { recursive: true })
    const tmpPath = join(materialsDir, `${INDEX_FILENAME}.${nanoid()}.tmp`)
    await writeFile(tmpPath, `${JSON.stringify(index, null, 2)}\n`)
    await rename(tmpPath, indexPath)
  }

  async function list(): Promise<Material[]> {
    const index = await readIndex()
    return [...index.materials].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async function get(id: string): Promise<Material | undefined> {
    const index = await readIndex()
    return index.materials.find(material => material.id === id)
  }

  async function create(data: CreateMaterialData): Promise<Material> {
    const index = await readIndex()
    const material: Material = {
      id: nanoid(),
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      source: data.source,
      mediaType: data.mediaType,
      audioPath: data.audioPath,
      duration: data.duration,
      subtitles: normalizeSubtitleCues(data.subtitles),
      youtubeUrl: data.youtubeUrl,
      tags: data.tags || [],
      createdAt: new Date().toISOString(),
      practiceCount: 0,
    }

    await writeIndex({
      version: 1,
      materials: [material, ...index.materials],
    })
    return material
  }

  async function update(id: string, data: UpdateMaterialData): Promise<Material | undefined> {
    const index = await readIndex()
    let updated: Material | undefined
    let previousAudioPath: string | undefined
    let shouldRemovePreviousAudio = false

    const materials = index.materials.map(material => {
      if (material.id !== id) return material

      const next: Material = {
        ...material,
        title: normalizeTitle(data.title) ?? material.title,
        description: normalizeOptionalText(data.description, material.description),
        difficulty: normalizeDifficulty(data.difficulty) ?? material.difficulty,
        audioPath: normalizePath(data.audioPath) ?? material.audioPath,
        duration: normalizeDuration(data.duration) ?? material.duration,
        subtitles: Array.isArray(data.subtitles)
          ? normalizeSubtitleCues(data.subtitles)
          : material.subtitles,
        tags: Array.isArray(data.tags) ? normalizeTags(data.tags) : material.tags,
      }

      updated = next
      previousAudioPath = material.audioPath
      shouldRemovePreviousAudio = material.source !== 'builtin' && next.audioPath !== material.audioPath
      return next
    })

    if (!updated) return undefined

    await writeIndex({ version: 1, materials })

    if (shouldRemovePreviousAudio && previousAudioPath) {
      await removeServedMaterialFile(previousAudioPath)
    }

    return updated
  }

  async function duplicate(id: string): Promise<Material | undefined> {
    const index = await readIndex()
    const source = index.materials.find(material => material.id === id)
    if (!source) return undefined

    const material: Material = {
      ...source,
      id: nanoid(),
      title: `${source.title}（副本）`,
      source: source.source === 'builtin' ? 'local' : source.source,
      audioPath: await duplicateMediaPath(source.audioPath),
      subtitles: normalizeSubtitleCues(source.subtitles),
      createdAt: new Date().toISOString(),
      lastPracticedAt: undefined,
      practiceCount: 0,
    }

    await writeIndex({
      version: 1,
      materials: [material, ...index.materials],
    })

    return material
  }

  async function exportMaterial(id: string): Promise<ExportedMaterialBundle | undefined> {
    const index = await readIndex()
    const material = index.materials.find(item => item.id === id)
    if (!material) return undefined

    return {
      type: 'shadow-reading.material',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      material,
      ...await getExportMedia(material.audioPath),
    }
  }

  async function exportMaterialText(id: string): Promise<ExportedMaterialText | undefined> {
    const index = await readIndex()
    const material = index.materials.find(item => item.id === id)
    if (!material) return undefined

    return {
      title: material.title,
      text: material.subtitles
        .map(cue => cue.text.trim())
        .filter(Boolean)
        .join('\n'),
    }
  }

  async function remove(id: string): Promise<void> {
    const index = await readIndex()
    const material = index.materials.find(item => item.id === id)
    if (!material) return

    await writeIndex({
      version: 1,
      materials: index.materials.filter(item => item.id !== id),
    })

    if (material.source !== 'builtin') {
      await removeServedMaterialFile(material.audioPath)
    }
  }

  async function removeServedMaterialFile(audioPath: string): Promise<void> {
    const filename = audioPath.match(/^\/api\/materials\/serve\/([^/]+)$/)?.[1]
    if (!filename) return

    const filePath = normalize(join(materialsDir, filename))
    if (isInsideMaterialsDir(filePath)) {
      await rm(filePath, { force: true })
    }
  }

  async function duplicateMediaPath(audioPath: string): Promise<string> {
    const filename = audioPath.match(/^\/api\/materials\/serve\/([^/]+)$/)?.[1]
    if (!filename) return audioPath

    const sourcePath = normalize(join(materialsDir, filename))
    if (!isInsideMaterialsDir(sourcePath)) return audioPath

    const extension = extname(filename) || '.mp3'
    const copyFilename = `${nanoid()}${extension}`
    const copyPath = join(materialsDir, copyFilename)
    await copyFile(sourcePath, copyPath)

    return `/api/materials/serve/${copyFilename}`
  }

  async function getExportMedia(audioPath: string): Promise<{ media?: ExportedMaterialBundle['media'] }> {
    const filename = audioPath.match(/^\/api\/materials\/serve\/([^/]+)$/)?.[1]
    if (!filename) {
      return audioPath
        ? { media: { embedded: false, path: audioPath } }
        : {}
    }

    const filePath = normalize(join(materialsDir, filename))
    if (!isInsideMaterialsDir(filePath)) {
      return { media: { embedded: false, path: audioPath } }
    }

    const fileBuffer = await readFile(filePath)
    return {
      media: {
        embedded: true,
        filename,
        contentType: getMediaContentType(filename),
        encoding: 'base64',
        data: fileBuffer.toString('base64'),
      },
    }
  }

  function isInsideMaterialsDir(filePath: string): boolean {
    const normalizedMaterialsDir = normalize(materialsDir)
    return filePath === normalizedMaterialsDir ||
      filePath.startsWith(`${normalizedMaterialsDir}/`)
  }

  async function incrementPracticeCount(id: string): Promise<void> {
    const index = await readIndex()
    let found = false
    const materials = index.materials.map(material => {
      if (material.id !== id) return material
      found = true
      return {
        ...material,
        lastPracticedAt: new Date().toISOString(),
        practiceCount: material.practiceCount + 1,
      }
    })
    if (!found) return

    await writeIndex({ version: 1, materials })
  }

  async function ensureBuiltinMaterial(): Promise<void> {
    const index = await readIndex()
    if (index.materials.some(material => material.id === BUILTIN_MATERIAL_ID)) return

    const { parseSRT } = await import('./srt-parser')
    const srtText = await readFile(
      join(rootDir, 'public', 'starter-materials', 'ted-julian-treasure.srt'),
      'utf-8'
    )

    const builtin: Material = {
      id: BUILTIN_MATERIAL_ID,
      title: 'How to Speak So That People Want to Listen — Julian Treasure',
      description: 'TED Talk on the art of speaking. Clear enunciation, moderate pace — great for intermediate shadow reading.',
      difficulty: 'intermediate',
      source: 'builtin',
      mediaType: 'audio',
      audioPath: '/starter-materials/ted-julian-treasure.mp3',
      duration: 598,
      subtitles: parseSRT(srtText),
      tags: ['ted', 'intermediate', 'speaking'],
      createdAt: '2026-04-01T00:00:00.000Z',
      practiceCount: 0,
    }

    await writeIndex({
      version: 1,
      materials: [builtin, ...index.materials],
    })
  }

  return {
    list,
    get,
    create,
    update,
    duplicate,
    exportMaterial,
    exportMaterialText,
    remove,
    incrementPracticeCount,
    ensureBuiltinMaterial,
  }
}

export const localMaterialsStore = createLocalMaterialsStore()

function normalizeTitle(title: unknown): string | undefined {
  if (typeof title !== 'string') return undefined
  const trimmed = title.trim()
  return trimmed || undefined
}

function normalizeOptionalText(value: unknown, fallback: string | undefined): string | undefined {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizeDifficulty(difficulty: unknown): DifficultyLevel | undefined {
  return difficulty === 'beginner' || difficulty === 'intermediate' || difficulty === 'advanced'
    ? difficulty
    : undefined
}

function normalizePath(path: unknown): string | undefined {
  if (typeof path !== 'string') return undefined
  const trimmed = path.trim()
  return trimmed || undefined
}

function normalizeDuration(duration: unknown): number | undefined {
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) return undefined
  return Math.round(duration)
}

function normalizeTags(tags: unknown[]): string[] {
  return [...new Set(
    tags
      .map(tag => typeof tag === 'string' ? tag.trim() : '')
      .filter(Boolean)
  )]
}

function normalizeSubtitleCues(cues: SubtitleCue[]): SubtitleCue[] {
  return cues
    .map((cue, index) => {
      const text = typeof cue.text === 'string' ? cue.text.trim() : ''
      const translation = typeof cue.translation === 'string' ? cue.translation.trim() : ''
      const startTime = Number.isFinite(cue.startTime) ? Math.max(0, cue.startTime) : 0
      const endTime = Number.isFinite(cue.endTime) ? Math.max(startTime + 0.1, cue.endTime) : startTime + 2

      if (!text) return null

      return {
        index,
        startTime: roundTime(startTime),
        endTime: roundTime(endTime),
        text,
        ...(translation ? { translation } : {}),
        ...normalizeSubtitleMarks(cue.marks, text.length),
      }
    })
    .filter((cue): cue is SubtitleCue => Boolean(cue))
}

function normalizeSubtitleMarks(marks: unknown, textLength: number): { marks?: SubtitleCue['marks'] } {
  if (!Array.isArray(marks) || textLength <= 0) return {}

  const cleanMarks = marks
    .map(mark => {
      if (!mark || typeof mark !== 'object') return null
      const candidate = mark as { start?: unknown; end?: unknown; type?: unknown; note?: unknown }
      const start = typeof candidate.start === 'number' && Number.isFinite(candidate.start)
        ? Math.max(0, Math.min(textLength, Math.floor(candidate.start)))
        : 0
      const end = typeof candidate.end === 'number' && Number.isFinite(candidate.end)
        ? Math.max(0, Math.min(textLength, Math.floor(candidate.end)))
        : 0
      const type = normalizeSubtitleMarkType(candidate.type)
      const note = typeof candidate.note === 'string' ? candidate.note.trim() : ''

      if (!type || end <= start) return null
      return {
        start,
        end,
        type,
        ...(note ? { note } : {}),
      }
    })
    .filter((mark): mark is NonNullable<SubtitleCue['marks']>[number] => Boolean(mark))
    .sort((a, b) => a.start - b.start || a.end - b.end)

  return cleanMarks.length > 0 ? { marks: cleanMarks } : {}
}

function normalizeSubtitleMarkType(type: unknown): NonNullable<SubtitleCue['marks']>[number]['type'] | null {
  return type === 'stress' ||
    type === 'rise' ||
    type === 'fall' ||
    type === 'fall-rise' ||
    type === 'linking' ||
    type === 'reduced'
    ? type
    : null
}

function getMediaContentType(filename: string): string {
  const extension = extname(filename).toLowerCase()
  if (extension === '.mp3') return 'audio/mpeg'
  if (extension === '.wav') return 'audio/wav'
  if (extension === '.ogg') return 'audio/ogg'
  if (extension === '.m4a' || extension === '.aac') return 'audio/mp4'
  if (extension === '.mp4') return 'video/mp4'
  if (extension === '.webm') return 'video/webm'
  if (extension === '.mov') return 'video/quicktime'
  return 'application/octet-stream'
}

function roundTime(value: number): number {
  return Math.round(value * 100) / 100
}
