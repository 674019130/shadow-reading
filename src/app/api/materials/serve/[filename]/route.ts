import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'data', 'materials')

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    const filePath = join(DATA_DIR, filename)

    // Prevent path traversal
    if (!filePath.startsWith(DATA_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const fileStat = await stat(filePath)
    const fileBuffer = await readFile(filePath)

    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      webm: 'audio/webm',
      m4a: 'audio/mp4',
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeTypes[ext || ''] || 'application/octet-stream',
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
