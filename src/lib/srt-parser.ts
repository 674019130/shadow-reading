import { SubtitleCue } from './types'

/**
 * Parse SRT subtitle format into SubtitleCue array.
 * Handles both SRT (comma separator) and VTT (dot separator) timestamp formats.
 */
export function parseSRT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = []

  // Detect VTT format and strip header
  let text = content.trim()
  if (text.startsWith('WEBVTT')) {
    text = text.replace(/^WEBVTT[^\n]*\n\n?/, '')
  }

  // Split into blocks by double newline
  const blocks = text.split(/\n\n+/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue

    // Find the timestamp line
    let timestampLineIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timestampLineIdx = i
        break
      }
    }
    if (timestampLineIdx === -1) continue

    const timestampLine = lines[timestampLineIdx]
    const match = timestampLine.match(
      /(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})/
    )
    if (!match) continue

    const startTime = parseTimestamp(match[1], match[2], match[3], match[4])
    const endTime = parseTimestamp(match[5], match[6], match[7], match[8])

    // Text is everything after the timestamp line
    const cueText = lines
      .slice(timestampLineIdx + 1)
      .join(' ')
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .trim()

    if (!cueText) continue

    cues.push({
      index: cues.length,
      startTime,
      endTime,
      text: cueText,
    })
  }

  // Sort by start time and normalize
  cues.sort((a, b) => a.startTime - b.startTime)
  cues.forEach((cue, i) => (cue.index = i))

  return cues
}

function parseTimestamp(
  hours: string | undefined,
  minutes: string,
  seconds: string,
  millis: string
): number {
  const h = hours ? parseInt(hours.replace(':', ''), 10) : 0
  const m = parseInt(minutes, 10)
  const s = parseInt(seconds, 10)
  const ms = parseInt(millis, 10)
  return h * 3600 + m * 60 + s + ms / 1000
}

/**
 * Parse plain text into subtitle cues (one sentence per cue, no timing).
 * Useful for transcripts without timestamps.
 */
export function parsePlainText(content: string, totalDuration: number): SubtitleCue[] {
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(Boolean)

  if (sentences.length === 0) return []

  const interval = totalDuration / sentences.length

  return sentences.map((text, index) => ({
    index,
    startTime: index * interval,
    endTime: (index + 1) * interval,
    text: text + '.',
  }))
}

/**
 * Parse JSON subtitle format: [{ start, end, text }]
 */
export function parseJSONSubtitles(content: string): SubtitleCue[] {
  const data = JSON.parse(content) as Array<{ start: number; end: number; text: string }>
  return data.map((item, index) => ({
    index,
    startTime: item.start,
    endTime: item.end,
    text: item.text,
  }))
}

/**
 * Auto-detect format and parse subtitles.
 */
export function parseSubtitles(content: string, totalDuration?: number): SubtitleCue[] {
  const trimmed = content.trim()

  // JSON format
  if (trimmed.startsWith('[')) {
    try {
      return parseJSONSubtitles(trimmed)
    } catch {
      // Fall through to other formats
    }
  }

  // SRT/VTT format (has --> timestamps)
  if (trimmed.includes('-->')) {
    return parseSRT(trimmed)
  }

  // Plain text fallback
  return parsePlainText(trimmed, totalDuration || 300)
}
