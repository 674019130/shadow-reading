import type { SubtitleCue } from './types'

export const SENTENCE_LOOP_LEAD_IN_SECONDS = 0.35
export const SENTENCE_LOOP_TAIL_SECONDS = 0.45

export interface SentenceLoopRange {
  startTime: number
  endTime: number
}

export function createSentenceLoopRange(
  cue: SubtitleCue,
  audioDuration: number,
  leadInSeconds = SENTENCE_LOOP_LEAD_IN_SECONDS,
  tailSeconds = SENTENCE_LOOP_TAIL_SECONDS
): SentenceLoopRange {
  const durationLimit = audioDuration > 0 ? audioDuration : Number.POSITIVE_INFINITY
  const rawStart = Math.max(0, cue.startTime - leadInSeconds)
  const startTime = Math.min(rawStart, durationLimit)
  const cueEnd = Math.max(cue.endTime, cue.startTime)
  const rawEnd = cueEnd + tailSeconds
  const endTime = Math.max(startTime, Math.min(rawEnd, durationLimit))

  return {
    startTime: roundTime(startTime),
    endTime: roundTime(endTime),
  }
}

function roundTime(value: number): number {
  return Math.round(value * 100) / 100
}
