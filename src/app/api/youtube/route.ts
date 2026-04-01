import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { readFile, readdir, mkdir } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'

const exec = promisify(execFile)
const CACHE_DIR = join(process.cwd(), 'data', 'youtube-cache')
const MATERIALS_DIR = join(process.cwd(), 'data', 'materials')

export const maxDuration = 60 // 60s timeout

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate it looks like a YouTube URL
    if (!url.match(/youtube\.com|youtu\.be/i)) {
      return NextResponse.json({ error: 'Not a valid YouTube URL' }, { status: 400 })
    }

    await mkdir(CACHE_DIR, { recursive: true })
    await mkdir(MATERIALS_DIR, { recursive: true })

    // Step 1: Get video info
    const { stdout: infoJson } = await exec('yt-dlp', [
      '--dump-json',
      '--no-playlist',
      url,
    ], { timeout: 30000 })

    const info = JSON.parse(infoJson)
    const videoId = info.id
    const title = info.title
    const duration = info.duration

    // Step 2: Download audio + subtitles
    await exec('yt-dlp', [
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '4',
      '--write-auto-sub',
      '--sub-lang', 'en',
      '--convert-subs', 'srt',
      '--no-playlist',
      '-o', join(CACHE_DIR, `${videoId}.%(ext)s`),
      url,
    ], { timeout: 120000 })

    // Step 3: Find the downloaded files
    const files = await readdir(CACHE_DIR)
    const audioFile = files.find(f => f.startsWith(videoId) && f.endsWith('.mp3'))
    const srtFile = files.find(f => f.startsWith(videoId) && f.endsWith('.srt'))

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio download failed' }, { status: 500 })
    }

    // Step 4: Copy audio to materials directory
    const audioContent = await readFile(join(CACHE_DIR, audioFile))
    const materialAudioPath = join(MATERIALS_DIR, audioFile)
    const { writeFile } = await import('fs/promises')
    await writeFile(materialAudioPath, audioContent)

    // Step 5: Read subtitles if available
    let subtitleContent: string | null = null
    if (srtFile) {
      subtitleContent = await readFile(join(CACHE_DIR, srtFile), 'utf-8')
    }

    return NextResponse.json({
      videoId,
      title,
      duration: Math.round(duration),
      audioPath: `/api/materials/serve/${audioFile}`,
      subtitleContent,
    })
  } catch (error) {
    console.error('YouTube download error:', error)
    const msg = error instanceof Error ? error.message : 'Download failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
