import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { nanoid } from 'nanoid'

const DATA_DIR = join(process.cwd(), 'data', 'materials')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const subtitleFile = formData.get('subtitle') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    await mkdir(DATA_DIR, { recursive: true })

    const id = nanoid()
    const audioExt = audioFile.name.split('.').pop() || 'mp3'
    const audioFilename = `${id}.${audioExt}`
    const audioPath = join(DATA_DIR, audioFilename)

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    await writeFile(audioPath, audioBuffer)

    let subtitleContent: string | null = null
    if (subtitleFile) {
      subtitleContent = await subtitleFile.text()
    }

    return NextResponse.json({
      audioPath: `/api/materials/serve/${audioFilename}`,
      subtitleContent,
      title: audioFile.name.replace(/\.[^.]+$/, ''),
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
