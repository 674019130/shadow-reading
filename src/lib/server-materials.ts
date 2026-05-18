import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, normalize } from 'node:path'
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

interface MaterialIndex {
  version: 1
  materials: Material[]
}

interface LocalMaterialsStore {
  list: () => Promise<Material[]>
  get: (id: string) => Promise<Material | undefined>
  create: (data: CreateMaterialData) => Promise<Material>
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
      subtitles: data.subtitles,
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

  async function remove(id: string): Promise<void> {
    const index = await readIndex()
    const material = index.materials.find(item => item.id === id)
    if (!material) return

    await writeIndex({
      version: 1,
      materials: index.materials.filter(item => item.id !== id),
    })

    if (material.source !== 'builtin') {
      const filename = material.audioPath.match(/^\/api\/materials\/serve\/([^/]+)$/)?.[1]
      if (filename) {
        const filePath = normalize(join(materialsDir, filename))
        if (filePath.startsWith(materialsDir)) {
          await rm(filePath, { force: true })
        }
      }
    }
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
    remove,
    incrementPracticeCount,
    ensureBuiltinMaterial,
  }
}

export const localMaterialsStore = createLocalMaterialsStore()
