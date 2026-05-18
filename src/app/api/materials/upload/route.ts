import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { nanoid } from 'nanoid'

const DATA_DIR = join(process.cwd(), 'data', 'materials')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const mediaFile = (formData.get('media') || formData.get('audio')) as File | null
    const subtitleFile = formData.get('subtitle') as File | null

    if (!mediaFile) {
      return NextResponse.json({ error: 'No media file provided' }, { status: 400 })
    }

    const mediaType = inferMediaType(mediaFile)

    if (!mediaType) {
      return NextResponse.json({ error: 'Unsupported media type' }, { status: 400 })
    }

    await mkdir(DATA_DIR, { recursive: true })

    const id = nanoid()
    const mediaExt = mediaFile.name.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'mp3')
    const mediaFilename = `${id}.${mediaExt}`
    const mediaPath = join(DATA_DIR, mediaFilename)

    const mediaBuffer = Buffer.from(await mediaFile.arrayBuffer())
    await writeFile(mediaPath, mediaBuffer)

    let subtitleContent: string | null = null
    if (subtitleFile) {
      subtitleContent = await subtitleFile.text()
    }

    return NextResponse.json({
      audioPath: `/api/materials/serve/${mediaFilename}`,
      mediaType,
      subtitleContent,
      title: mediaFile.name.replace(/\.[^.]+$/, ''),
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

function inferMediaType(file: File): 'audio' | 'video' | null {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext) return null

  if (['mp4', 'm4v', 'mov', 'webm'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio'
  return null
}
