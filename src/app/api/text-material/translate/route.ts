import { NextRequest, NextResponse } from 'next/server'
import { translateSentencesToChinese } from '@/lib/free-translation'
import { normalizeTextForPractice, splitIntoSentences } from '@/lib/text-material'

export const runtime = 'nodejs'

const MAX_TEXT_LENGTH = 4096

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = normalizeTextForPractice(String(body.text || ''))
    const requestedSentences = Array.isArray(body.sentences)
      ? body.sentences
          .map((sentence: unknown) => normalizeTextForPractice(String(sentence || '')))
          .filter(Boolean)
      : []
    const sourceText = requestedSentences.length > 0 ? requestedSentences.join(' ') : text

    if (!sourceText) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 })
    }

    if (sourceText.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text is too long. Keep it under ${MAX_TEXT_LENGTH} characters.` },
        { status: 400 }
      )
    }

    const sentences = requestedSentences.length > 0 ? requestedSentences : splitIntoSentences(text)
    const { translations, providers } = await translateSentencesToChinese(sentences)

    return NextResponse.json({
      sentences,
      translations,
      providers,
    })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json({ error: 'Translation failed.' }, { status: 500 })
  }
}
