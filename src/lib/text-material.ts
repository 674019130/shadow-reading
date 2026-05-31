import { SentenceSplitterSyntax, split as splitTextIntoSentenceNodes } from 'sentence-splitter'
import type { SubtitleCue } from './types'

export type TextRevisionMode = 'grammar' | 'natural' | 'spoken'

export type TtsVoice = 'marin' | 'cedar' | 'coral' | 'nova' | 'sage' | 'verse'

export interface TtsVoiceOption {
  value: TtsVoice
  label: string
  description: string
  descriptionZh: string
  previewPath: string
  previewText: string
}

export interface TextRevisionChange {
  before: string
  after: string
  reason: string
}

export interface TextRevision {
  originalText: string
  revisedText: string
  titleSuggestion: string
  changes: TextRevisionChange[]
  notes: string[]
}

export const TEXT_REVISION_MODES: { value: TextRevisionMode; label: string; labelZh: string; description: string; descriptionZh: string }[] = [
  {
    value: 'grammar',
    label: 'Grammar',
    labelZh: '语法',
    description: 'Fix grammar while preserving your wording.',
    descriptionZh: '只修语法，尽量保留原表达。',
  },
  {
    value: 'natural',
    label: 'Natural',
    labelZh: '自然',
    description: 'Make it sound like polished everyday English.',
    descriptionZh: '改成更自然、顺口的英语。',
  },
  {
    value: 'spoken',
    label: 'Spoken',
    labelZh: '口语',
    description: 'Make it easy to say aloud in conversation.',
    descriptionZh: '改成更适合开口说的版本。',
  },
]

export const VOICE_PREVIEW_TEXT = 'Hi, I am your shadow-reading coach. Let us practice natural English with clear rhythm and confident pronunciation.'

export const TTS_VOICES: TtsVoiceOption[] = [
  { value: 'marin', label: 'Marin', description: 'Natural, clear, balanced', descriptionZh: '自然清晰，最均衡', previewPath: '/voice-previews/marin.mp3', previewText: VOICE_PREVIEW_TEXT },
  { value: 'cedar', label: 'Cedar', description: 'Warm, steady, mature', descriptionZh: '温和稳定，偏成熟', previewPath: '/voice-previews/cedar.mp3', previewText: VOICE_PREVIEW_TEXT },
  { value: 'coral', label: 'Coral', description: 'Bright, conversational', descriptionZh: '明亮，有对话感', previewPath: '/voice-previews/coral.mp3', previewText: VOICE_PREVIEW_TEXT },
  { value: 'nova', label: 'Nova', description: 'Clean, energetic', descriptionZh: '干净，有活力', previewPath: '/voice-previews/nova.mp3', previewText: VOICE_PREVIEW_TEXT },
  { value: 'sage', label: 'Sage', description: 'Soft, calm, precise', descriptionZh: '柔和安静，咬字清楚', previewPath: '/voice-previews/sage.mp3', previewText: VOICE_PREVIEW_TEXT },
  { value: 'verse', label: 'Verse', description: 'Expressive, smooth', descriptionZh: '表达感强，流畅', previewPath: '/voice-previews/verse.mp3', previewText: VOICE_PREVIEW_TEXT },
]

export function normalizeTextForPractice(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function splitIntoSentences(text: string): string[] {
  const normalized = normalizeTextForPractice(text)
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return []

  return splitTextIntoSentenceNodes(normalized)
    .filter(node => node.type === SentenceSplitterSyntax.Sentence)
    .map(node => node.raw.trim())
    .filter(Boolean)
}

export function estimateSpeechDuration(text: string): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.max(4, Math.ceil((wordCount / 145) * 60))
}

export function createEstimatedSubtitleCues(
  text: string,
  duration: number,
  translations: string[] = []
): SubtitleCue[] {
  return createEstimatedSubtitleCuesFromSentences(splitIntoSentences(text), duration, translations)
}

export function createEstimatedSubtitleCuesFromSentences(
  sentences: string[],
  duration: number,
  translations: string[] = []
): SubtitleCue[] {
  const cleanSentences = sentences.map(sentence => sentence.trim()).filter(Boolean)
  if (cleanSentences.length === 0) return []

  const totalWeight = cleanSentences.reduce((sum, sentence) => sum + sentenceWeight(sentence), 0)
  const safeDuration = Math.max(duration, cleanSentences.length * 1.8)
  let cursor = 0

  return cleanSentences.map((sentence, index) => {
    const isLast = index === cleanSentences.length - 1
    const rawLength = isLast
      ? safeDuration - cursor
      : (safeDuration * sentenceWeight(sentence)) / totalWeight
    const cueLength = Math.max(1.4, rawLength)
    const startTime = roundTime(cursor)
    const endTime = roundTime(isLast ? safeDuration : Math.min(safeDuration, cursor + cueLength))

    cursor = endTime

    const translation = translations[index]?.trim()

    return {
      index,
      startTime,
      endTime,
      text: sentence,
      ...(translation ? { translation } : {}),
    }
  })
}

export function createSpeechInstructions(mode: TextRevisionMode): string {
  const base = 'Speak in natural, clear English for shadow-reading practice. Use realistic intonation, light pauses between sentences, and a steady pace that an English learner can follow without sounding slow.'

  if (mode === 'spoken') {
    return `${base} Make it conversational, relaxed, and easy to repeat aloud.`
  }

  if (mode === 'grammar') {
    return `${base} Keep the delivery neutral and precise, like a patient native-speaking coach.`
  }

  return `${base} Make it polished, warm, and natural.`
}

function sentenceWeight(sentence: string): number {
  const words = sentence.split(/\s+/).filter(Boolean).length
  return Math.max(4, words)
}

function roundTime(value: number): number {
  return Math.round(value * 100) / 100
}
