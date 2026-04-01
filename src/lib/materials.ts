import { db } from './db'
import { nanoid } from 'nanoid'
import { parseSRT } from './srt-parser'
import type { Material, DifficultyLevel, MaterialSource, SubtitleCue } from './types'

export async function getAllMaterials(): Promise<Material[]> {
  return db.materials.orderBy('createdAt').reverse().toArray()
}

export async function getMaterial(id: string): Promise<Material | undefined> {
  return db.materials.get(id)
}

export async function createMaterial(data: {
  title: string
  difficulty: DifficultyLevel
  source: MaterialSource
  audioPath: string
  duration: number
  subtitles: SubtitleCue[]
  description?: string
  youtubeUrl?: string
  tags?: string[]
}): Promise<Material> {
  const material: Material = {
    id: nanoid(),
    title: data.title,
    description: data.description,
    difficulty: data.difficulty,
    source: data.source,
    audioPath: data.audioPath,
    duration: data.duration,
    subtitles: data.subtitles,
    youtubeUrl: data.youtubeUrl,
    tags: data.tags || [],
    createdAt: new Date().toISOString(),
    practiceCount: 0,
  }
  await db.materials.add(material)
  return material
}

export async function deleteMaterial(id: string): Promise<void> {
  await db.materials.delete(id)
}

export async function updateMaterialPractice(id: string): Promise<void> {
  await db.materials.update(id, {
    lastPracticedAt: new Date().toISOString(),
    practiceCount: (await db.materials.get(id))!.practiceCount + 1,
  })
}

// Built-in materials to seed on first launch
const BUILTIN_MATERIALS = [
  {
    title: 'How to Speak So That People Want to Listen — Julian Treasure',
    difficulty: 'intermediate' as DifficultyLevel,
    audioPath: '/starter-materials/ted-julian-treasure.mp3',
    srtPath: '/starter-materials/ted-julian-treasure.srt',
    duration: 598,
    description: 'TED Talk on the art of speaking. Clear enunciation, moderate pace — great for intermediate shadow reading.',
    tags: ['ted', 'intermediate', 'speaking'],
  },
]

// Seed built-in materials if DB is empty
export async function seedBuiltinMaterials(): Promise<void> {
  const count = await db.materials.count()
  if (count > 0) return

  for (const m of BUILTIN_MATERIALS) {
    try {
      const srtRes = await fetch(m.srtPath)
      const srtText = await srtRes.text()
      const subtitles = parseSRT(srtText)

      await createMaterial({
        title: m.title,
        difficulty: m.difficulty,
        source: 'builtin',
        audioPath: m.audioPath,
        duration: m.duration,
        subtitles,
        description: m.description,
        tags: m.tags,
      })
    } catch (err) {
      console.error(`Failed to seed material: ${m.title}`, err)
    }
  }
}
