import { NextRequest, NextResponse } from 'next/server'
import { normalizeTextForPractice, type TextRevisionMode } from '@/lib/text-material'

export const runtime = 'nodejs'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const MAX_TEXT_LENGTH = 4096
const REVISION_MODES: TextRevisionMode[] = ['grammar', 'natural', 'spoken']

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is required to check and rewrite pasted text.' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const text = normalizeTextForPractice(String(body.text || ''))
    const mode = REVISION_MODES.includes(body.mode) ? body.mode : 'natural'

    if (!text) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 })
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text is too long. Keep it under ${MAX_TEXT_LENGTH} characters for one generated audio material.` },
        { status: 400 }
      )
    }

    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
        instructions: createRevisionInstructions(mode),
        input: text,
        max_output_tokens: 1800,
        text: {
          format: {
            type: 'json_schema',
            name: 'shadow_text_revision',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['revisedText', 'titleSuggestion', 'changes', 'notes'],
              properties: {
                revisedText: { type: 'string' },
                titleSuggestion: { type: 'string' },
                changes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['before', 'after', 'reason'],
                    properties: {
                      before: { type: 'string' },
                      after: { type: 'string' },
                      reason: { type: 'string' },
                    },
                  },
                },
                notes: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: await readOpenAIError(response, 'Text check failed.') },
        { status: response.status }
      )
    }

    const data = await response.json()
    const outputText = extractOutputText(data)
    const parsed = JSON.parse(outputText)

    return NextResponse.json({
      revision: {
        originalText: text,
        revisedText: normalizeTextForPractice(parsed.revisedText || text),
        titleSuggestion: String(parsed.titleSuggestion || 'Pasted English Practice').slice(0, 80),
        changes: Array.isArray(parsed.changes) ? parsed.changes : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      },
    })
  } catch (error) {
    console.error('Text revision error:', error)
    return NextResponse.json({ error: 'Text check failed.' }, { status: 500 })
  }
}

function createRevisionInstructions(mode: TextRevisionMode): string {
  const shared = [
    'You are an English speaking coach for a Chinese learner.',
    'Check the pasted English before it becomes a shadow-reading script.',
    'Preserve the user intent and do not add new facts.',
    'Keep the result suitable for natural spoken audio.',
    'Return only valid JSON matching the schema.',
  ]

  if (mode === 'grammar') {
    return [...shared, 'Fix only grammar, punctuation, and obvious word-choice errors. Keep the original style.'].join(' ')
  }

  if (mode === 'spoken') {
    return [...shared, 'Rewrite lightly so it sounds natural, concise, and easy to say aloud in conversation.'].join(' ')
  }

  return [...shared, 'Make the English natural and polished while staying close to the original wording.'].join(' ')
}

function extractOutputText(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'output_text' in data) {
    const outputText = (data as { output_text?: unknown }).output_text
    if (typeof outputText === 'string') return outputText
  }

  const output = (data as { output?: unknown }).output
  if (!Array.isArray(output)) throw new Error('Missing model output.')

  for (const item of output) {
    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue

    for (const part of content) {
      const text = (part as { text?: unknown }).text
      if (typeof text === 'string') return text
    }
  }

  throw new Error('Missing model output text.')
}

async function readOpenAIError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null)
  const message = body?.error?.message
  return typeof message === 'string' ? message : fallback
}
