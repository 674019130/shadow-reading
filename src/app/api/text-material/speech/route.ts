import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import {
  TTS_VOICES,
  createSpeechInstructions,
  normalizeTextForPractice,
  type TextRevisionMode,
  type TtsVoice,
} from '@/lib/text-material'

export const runtime = 'nodejs'

const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech'
const DATA_DIR = join(process.cwd(), 'data', 'materials')
const MAX_TEXT_LENGTH = 4096
const VOICES: TtsVoice[] = TTS_VOICES.map(voice => voice.value)
const MODES: TextRevisionMode[] = ['grammar', 'natural', 'spoken']

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is required to generate natural speech.' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const text = normalizeTextForPractice(String(body.text || ''))
    const voice = VOICES.includes(body.voice) ? body.voice : 'marin'
    const mode = MODES.includes(body.mode) ? body.mode : 'natural'
    const instructions = typeof body.instructions === 'string' && body.instructions.trim()
      ? body.instructions.trim()
      : createSpeechInstructions(mode)

    if (!text) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 })
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text is too long. Keep it under ${MAX_TEXT_LENGTH} characters for one generated audio material.` },
        { status: 400 }
      )
    }

    const response = await fetch(OPENAI_SPEECH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
        input: text,
        voice,
        instructions,
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: await readOpenAIError(response, 'Speech generation failed.') },
        { status: response.status }
      )
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    await mkdir(DATA_DIR, { recursive: true })

    const filename = `text-${nanoid()}.mp3`
    await writeFile(join(DATA_DIR, filename), audioBuffer)

    return NextResponse.json({
      audioPath: `/api/materials/serve/${filename}`,
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice,
      instructions,
      aiGenerated: true,
    })
  } catch (error) {
    console.error('Speech generation error:', error)
    return NextResponse.json({ error: 'Speech generation failed.' }, { status: 500 })
  }
}

async function readOpenAIError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null)
  const message = body?.error?.message
  return typeof message === 'string' ? message : fallback
}
