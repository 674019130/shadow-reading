'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import type { SubtitleCue } from '@/lib/types'
import DictionaryPopup from './DictionaryPopup'

interface SubtitleDisplayProps {
  subtitles: SubtitleCue[]
  currentTime: number
  visible: boolean
  onCueClick?: (cue: SubtitleCue) => void
}

export default function SubtitleDisplay({
  subtitles,
  currentTime,
  visible,
  onCueClick,
}: SubtitleDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const [dictWord, setDictWord] = useState<string | null>(null)
  const [dictPos, setDictPos] = useState({ x: 0, y: 0 })

  const currentIndex = useMemo(() => {
    if (subtitles.length === 0) return -1

    let lo = 0
    let hi = subtitles.length - 1
    let result = -1

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (subtitles[mid].startTime <= currentTime) {
        result = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }

    if (result >= 0 && currentTime <= subtitles[result].endTime) {
      return result
    }
    return -1
  }, [subtitles, currentTime])

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentIndex])

  // Double-click to look up word
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const selection = window.getSelection()
    const word = selection?.toString().trim()
    if (!word || word.includes(' ')) return

    // Get position of the selected word
    const range = selection?.getRangeAt(0)
    if (!range) return
    const rect = range.getBoundingClientRect()

    setDictWord(word)
    setDictPos({ x: rect.left, y: rect.bottom })

    // Prevent the click from triggering cue seek
    e.stopPropagation()
  }, [])

  if (!visible) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-center space-y-2">
          <p className="text-[13px] text-text-muted/60">
            Subtitles hidden
          </p>
          <p className="text-[11px] text-text-muted/40">
            press S to show
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto py-2 space-y-px max-h-[320px]"
        onDoubleClick={handleDoubleClick}
      >
        {subtitles.map((cue, i) => {
          const isActive = i === currentIndex
          const isPast = currentIndex > -1 && i < currentIndex
          return (
            <div
              key={cue.index}
              ref={isActive ? activeRef : undefined}
              onClick={() => onCueClick?.(cue)}
              className={`
                group flex items-start gap-3 py-2.5 px-3 rounded-md cursor-pointer transition-all
                ${isActive
                  ? 'cue-active bg-accent-soft'
                  : 'hover:bg-bg-card/50'
                }
              `}
            >
              <span
                className={`
                  text-[10px] font-mono mt-[5px] select-none shrink-0 tabular-nums transition-colors
                  ${isActive ? 'text-accent' : 'text-text-muted/40 group-hover:text-text-muted'}
                `}
              >
                {formatCueTime(cue.startTime)}
              </span>
              <span
                className={`
                  subtitle-text transition-colors select-text
                  ${isActive
                    ? 'text-text-primary'
                    : isPast
                      ? 'text-text-muted/60'
                      : 'text-text-secondary group-hover:text-text-primary'
                  }
                `}
              >
                {cue.text}
              </span>
            </div>
          )
        })}
      </div>

      {dictWord && (
        <DictionaryPopup
          word={dictWord}
          position={dictPos}
          onClose={() => setDictWord(null)}
        />
      )}
    </>
  )
}

function formatCueTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
