'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { SubtitleCue, SubtitleMark, SubtitleMarkType } from '@/lib/types'
import DictionaryPopup from './DictionaryPopup'
import TranslationPopup from './TranslationPopup'

interface SubtitleDisplayProps {
  subtitles: SubtitleCue[]
  currentTime: number
  visible: boolean
  onCueClick?: (cue: SubtitleCue) => void
  onCueMarksChange?: (cueIndex: number, marks: SubtitleMark[]) => void
}

interface MarkSelection {
  cueIndex: number
  start: number
  end: number
  type: SubtitleMarkType
  note: string
  x: number
  y: number
}

interface TranslationState {
  cue: SubtitleCue
  position: { x: number; y: number }
}

interface DictionaryHit {
  word: string
  rect?: DOMRect
}

interface ActiveMarkEditor {
  cueIndex: number
  markIndex: number
  mark: SubtitleMark
  x: number
  y: number
}

const MARK_OPTIONS: { type: SubtitleMarkType; label: string; className: string }[] = [
  { type: 'stress', label: '重读', className: 'text-accent' },
  { type: 'rise', label: '升调 ↗', className: 'text-green' },
  { type: 'fall', label: '降调 ↘', className: 'text-red' },
  { type: 'fall-rise', label: '降升 ↘↗', className: 'text-phase-retell' },
  { type: 'linking', label: '连读', className: 'text-orange' },
  { type: 'reduced', label: '轻读', className: 'text-text-muted' },
]

export default function SubtitleDisplay({
  subtitles,
  currentTime,
  visible,
  onCueClick,
  onCueMarksChange,
}: SubtitleDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const [dictWord, setDictWord] = useState<string | null>(null)
  const [dictPos, setDictPos] = useState({ x: 0, y: 0 })
  const [translation, setTranslation] = useState<TranslationState | null>(null)
  const [markSelection, setMarkSelection] = useState<MarkSelection | null>(null)
  const [activeMark, setActiveMark] = useState<ActiveMarkEditor | null>(null)

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

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setMarkSelection(null)
      return
    }

    const cueTextElement = getCueTextElement(selection.anchorNode)
    if (
      !cueTextElement ||
      !selection.focusNode ||
      !cueTextElement.contains(selection.focusNode)
    ) {
      setMarkSelection(null)
      return
    }

    const cueIndex = Number(cueTextElement.dataset.cueIndex)
    if (!Number.isFinite(cueIndex)) {
      setMarkSelection(null)
      return
    }

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    const leadingWhitespace = selectedText.match(/^\s*/)?.[0].length ?? 0
    const trailingWhitespace = selectedText.match(/\s*$/)?.[0].length ?? 0
    const cleanLength = selectedText.length - leadingWhitespace - trailingWhitespace
    if (cleanLength <= 0) {
      setMarkSelection(null)
      return
    }

    const beforeRange = document.createRange()
    beforeRange.selectNodeContents(cueTextElement)
    beforeRange.setEnd(range.startContainer, range.startOffset)

    const start = beforeRange.toString().length + leadingWhitespace
    const end = start + cleanLength
    const rect = range.getBoundingClientRect()

    setMarkSelection({
      cueIndex,
      start,
      end,
      type: 'stress',
      note: '',
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
    setActiveMark(null)
  }, [])

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('[data-subtitle-mark]')) {
      event.stopPropagation()
      return
    }

    const cueRow = (event.target as HTMLElement).closest<HTMLElement>('[data-cue-row]')
    const cueIndex = cueRow ? Number(cueRow.dataset.cueIndex) : NaN
    const cue = Number.isFinite(cueIndex)
      ? subtitles.find(item => item.index === cueIndex)
      : null

    const selection = window.getSelection()
    const selectedWord = getDictionaryWord(selection)
    const selectedTextElement = getCueTextElement(selection?.anchorNode || null)
    const pointWord = selectedWord && selectedTextElement
      ? null
      : getDictionaryWordAtPoint(event)
    const dictionaryHit = selectedWord && selectedTextElement
      ? {
          word: selectedWord,
          rect: selection?.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : undefined,
        }
      : pointWord

    if (dictionaryHit) {
      setDictWord(dictionaryHit.word)
      setDictPos({
        x: dictionaryHit.rect?.left ?? event.clientX,
        y: dictionaryHit.rect?.bottom ?? event.clientY,
      })
      setTranslation(null)
      setMarkSelection(null)
      setActiveMark(null)
      event.stopPropagation()
      return
    }

    if (cue?.translation) {
      setTranslation({
        cue,
        position: {
          x: Math.min(event.clientX + 12, window.innerWidth - 440),
          y: Math.min(event.clientY + 12, window.innerHeight - 240),
        },
      })
      setDictWord(null)
      setMarkSelection(null)
      setActiveMark(null)
      event.stopPropagation()
    }
  }, [subtitles])

  const handleMarkClick = useCallback((
    event: React.MouseEvent,
    cue: SubtitleCue,
    mark: SubtitleMark,
    renderedMarkIndex: number
  ) => {
    event.preventDefault()
    event.stopPropagation()
    window.getSelection()?.removeAllRanges()

    setMarkSelection(null)
    setDictWord(null)
    setTranslation(null)
    setActiveMark({
      cueIndex: cue.index,
      markIndex: findMatchingMarkIndex(cue.marks || [], mark, renderedMarkIndex),
      mark,
      x: event.clientX,
      y: event.clientY,
    })
  }, [])

  const saveMarkSelection = useCallback(() => {
    if (!markSelection || !onCueMarksChange) return
    const cue = subtitles.find(item => item.index === markSelection.cueIndex)
    if (!cue) return

    const nextMarks = (cue.marks || []).filter(mark =>
      mark.end <= markSelection.start || mark.start >= markSelection.end
    )
    const note = markSelection.note.trim()

    nextMarks.push({
      start: markSelection.start,
      end: markSelection.end,
      type: markSelection.type,
      ...(note ? { note } : {}),
    })

    nextMarks.sort((a, b) => a.start - b.start || a.end - b.end)
    onCueMarksChange(cue.index, nextMarks)
    window.getSelection()?.removeAllRanges()
    setMarkSelection(null)
    setActiveMark(null)
  }, [markSelection, onCueMarksChange, subtitles])

  const clearMarkSelection = useCallback(() => {
    if (!markSelection || !onCueMarksChange) return
    const cue = subtitles.find(item => item.index === markSelection.cueIndex)
    if (!cue) return

    onCueMarksChange(
      cue.index,
      (cue.marks || []).filter(mark =>
        mark.end <= markSelection.start || mark.start >= markSelection.end
      )
    )
    window.getSelection()?.removeAllRanges()
    setMarkSelection(null)
  }, [markSelection, onCueMarksChange, subtitles])

  const saveActiveMark = useCallback(() => {
    if (!activeMark || !onCueMarksChange) return
    const cue = subtitles.find(item => item.index === activeMark.cueIndex)
    if (!cue) return

    const nextMarks = [...(cue.marks || [])]
    const safeIndex = Math.max(0, Math.min(activeMark.markIndex, nextMarks.length - 1))
    const note = activeMark.mark.note?.trim()
    nextMarks[safeIndex] = {
      start: activeMark.mark.start,
      end: activeMark.mark.end,
      type: activeMark.mark.type,
      ...(note ? { note } : {}),
    }

    onCueMarksChange(cue.index, nextMarks)
    setActiveMark(null)
  }, [activeMark, onCueMarksChange, subtitles])

  const deleteActiveMark = useCallback(() => {
    if (!activeMark || !onCueMarksChange) return
    const cue = subtitles.find(item => item.index === activeMark.cueIndex)
    if (!cue) return

    onCueMarksChange(
      cue.index,
      (cue.marks || []).filter((_, index) => index !== activeMark.markIndex)
    )
    setActiveMark(null)
  }, [activeMark, onCueMarksChange, subtitles])

  if (!visible) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-center space-y-2">
          <p className="text-[13px] text-text-muted/60">
            字幕已隐藏 / Subtitles hidden
          </p>
          <p className="text-[11px] text-text-muted/40">
            按 S 显示 / press S to show
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-y-auto py-2 space-y-px"
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {subtitles.map((cue, i) => {
          const isActive = i === currentIndex
          const isPast = currentIndex > -1 && i < currentIndex
          return (
            <div
              key={cue.index}
              data-cue-row
              data-cue-index={cue.index}
              ref={isActive ? activeRef : undefined}
              className={`
                group flex items-start gap-3 py-2.5 px-3 rounded-md transition-all
                ${isActive
                  ? 'cue-active bg-accent-soft'
                  : 'hover:bg-bg-card/50'
                }
              `}
            >
              <button
                type="button"
                onClick={() => onCueClick?.(cue)}
                aria-label={`跳到 ${formatCueTime(cue.startTime)} / Seek to ${formatCueTime(cue.startTime)}`}
                title="跳到这一句 / Seek to this sentence"
                className={`
                  rounded px-1 py-0.5 text-[10px] font-mono mt-[3px] select-none shrink-0 tabular-nums transition-colors hover:bg-bg-elevated
                  ${isActive ? 'text-accent' : 'text-text-muted/40 group-hover:text-text-muted'}
                `}
              >
                {formatCueTime(cue.startTime)}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  data-cue-text
                  data-cue-index={cue.index}
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
                  {renderMarkedText(cue, handleMarkClick)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {markSelection && (
        <div
          role="dialog"
          aria-label="新增发音标注 / Add pronunciation mark"
          className="fixed z-[70] w-[min(320px,calc(100vw-32px))] rounded-lg border border-border bg-bg-elevated p-3 shadow-xl"
          style={clampEditorPosition(markSelection.x - 160, markSelection.y - 255)}
          onMouseDown={event => event.stopPropagation()}
          onClick={event => event.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[12px] font-medium text-text-primary">新增标注 / Add mark</p>
            <button
              onClick={() => setMarkSelection(null)}
              className="rounded px-1.5 py-0.5 text-[12px] text-text-muted transition-colors hover:text-text-secondary"
            >
              关闭
            </button>
          </div>

          <div className="mb-2 grid grid-cols-3 gap-1 rounded-md bg-bg-inset p-0.5">
            {MARK_OPTIONS.map(option => (
              <button
                key={option.type}
                onClick={() => setMarkSelection(current => current
                  ? { ...current, type: option.type }
                  : current
                )}
                className={`rounded px-2 py-1.5 text-[12px] transition-colors ${
                  markSelection.type === option.type
                    ? 'bg-bg-elevated text-text-primary'
                    : `${option.className} hover:bg-bg-card`
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="mb-1 block text-[11px] text-text-muted">备注 / Note</label>
          <textarea
            value={markSelection.note}
            onChange={event => setMarkSelection(current => current
              ? { ...current, note: event.target.value }
              : current
            )}
            rows={3}
            placeholder="比如：这里要弱读成 /tə/..."
            className="w-full resize-none rounded-md border border-border bg-bg-inset px-2.5 py-2 text-[12px] leading-5 text-text-primary placeholder:text-text-muted/40 outline-none transition-colors focus:border-border-active"
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              onClick={clearMarkSelection}
              className="rounded-md px-2.5 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-bg-card hover:text-text-secondary"
            >
              清除 / Clear
            </button>
            <button
              onClick={saveMarkSelection}
              className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-bg-primary transition-colors hover:bg-accent-hover"
            >
              保存 / Save
            </button>
          </div>
        </div>
      )}

      {activeMark && (
        <div
          role="dialog"
          aria-label="编辑发音标注 / Edit pronunciation mark"
          className="fixed z-[75] w-[280px] rounded-lg border border-border bg-bg-elevated p-3 shadow-xl"
          style={clampEditorPosition(activeMark.x + 10, activeMark.y + 10)}
          onMouseDown={event => event.stopPropagation()}
          onClick={event => event.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[12px] font-medium text-text-primary">编辑标注 / Edit mark</p>
            <button
              onClick={() => setActiveMark(null)}
              className="rounded px-1.5 py-0.5 text-[12px] text-text-muted transition-colors hover:text-text-secondary"
            >
              关闭
            </button>
          </div>

          <div className="mb-2 grid grid-cols-3 gap-1 rounded-md bg-bg-inset p-0.5">
            {MARK_OPTIONS.map(option => (
              <button
                key={option.type}
                onClick={() => setActiveMark(current => current
                  ? { ...current, mark: { ...current.mark, type: option.type } }
                  : current
                )}
                className={`rounded px-2 py-1.5 text-[12px] transition-colors ${
                  activeMark.mark.type === option.type
                    ? 'bg-bg-elevated text-text-primary'
                    : `${option.className} hover:bg-bg-card`
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="mb-1 block text-[11px] text-text-muted">备注 / Note</label>
          <textarea
            value={activeMark.mark.note || ''}
            onChange={event => setActiveMark(current => current
              ? { ...current, mark: { ...current.mark, note: event.target.value } }
              : current
            )}
            rows={3}
            placeholder="比如：这里要弱读成 /tə/..."
            className="w-full resize-none rounded-md border border-border bg-bg-inset px-2.5 py-2 text-[12px] leading-5 text-text-primary placeholder:text-text-muted/40 outline-none transition-colors focus:border-border-active"
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              onClick={deleteActiveMark}
              className="rounded-md px-2.5 py-1.5 text-[12px] text-red transition-colors hover:bg-red-soft"
            >
              删除 / Delete
            </button>
            <button
              onClick={saveActiveMark}
              className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-bg-primary transition-colors hover:bg-accent-hover"
            >
              保存 / Save
            </button>
          </div>
        </div>
      )}

      {translation && (
        <TranslationPopup
          key={`${translation.cue.index}-${translation.position.x}-${translation.position.y}`}
          text={translation.cue.text}
          translation={translation.cue.translation || ''}
          position={translation.position}
          onClose={() => setTranslation(null)}
        />
      )}

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

function getCueTextElement(node: Node | null): HTMLElement | null {
  if (!node) return null
  const element = node instanceof HTMLElement ? node : node.parentElement
  return element?.closest<HTMLElement>('[data-cue-text]') || null
}

function getDictionaryWord(selection: Selection | null): string | null {
  const raw = selection?.toString().trim()
  if (!raw || /\s/.test(raw)) return null

  const word = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
  if (!word || /\s/.test(word) || !/[\p{L}\p{N}]/u.test(word)) return null

  return word
}

function getDictionaryWordAtPoint(event: React.MouseEvent): DictionaryHit | null {
  const cueTextElement = (event.target as HTMLElement).closest<HTMLElement>('[data-cue-text]')
  if (!cueTextElement) return null

  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }

  const caretPosition = doc.caretPositionFromPoint?.(event.clientX, event.clientY)
  const caretRange = caretPosition ? null : doc.caretRangeFromPoint?.(event.clientX, event.clientY)
  const node = caretPosition?.offsetNode || caretRange?.startContainer
  const offset = caretPosition?.offset ?? caretRange?.startOffset

  if (!node || typeof offset !== 'number' || node.nodeType !== Node.TEXT_NODE) return null
  if (!cueTextElement.contains(node)) return null

  const text = node.textContent || ''
  const wordRange = getWordRange(text, offset)
  if (!wordRange) return null

  const range = document.createRange()
  range.setStart(node, wordRange.start)
  range.setEnd(node, wordRange.end)

  return {
    word: text.slice(wordRange.start, wordRange.end),
    rect: range.getBoundingClientRect(),
  }
}

function getWordRange(text: string, offset: number): { start: number; end: number } | null {
  const isWordCharacter = (char: string) => /[\p{L}\p{N}'’-]/u.test(char)
  let cursor = Math.max(0, Math.min(text.length, offset))

  if (cursor === text.length || !isWordCharacter(text[cursor])) {
    if (cursor > 0 && isWordCharacter(text[cursor - 1])) {
      cursor -= 1
    } else {
      return null
    }
  }

  let start = cursor
  let end = cursor + 1

  while (start > 0 && isWordCharacter(text[start - 1])) start -= 1
  while (end < text.length && isWordCharacter(text[end])) end += 1

  const word = text.slice(start, end).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
  if (!word || !/[\p{L}\p{N}]/u.test(word)) return null

  return { start, end }
}

function renderMarkedText(
  cue: SubtitleCue,
  onMarkClick: (
    event: React.MouseEvent,
    cue: SubtitleCue,
    mark: SubtitleMark,
    renderedMarkIndex: number
  ) => void
): ReactNode {
  const text = cue.text
  const marks = normalizeMarksForRender(cue.marks, text.length)
  if (marks.length === 0) return text

  const parts: ReactNode[] = []
  let cursor = 0

  marks.forEach((mark, index) => {
    if (mark.start > cursor) {
      parts.push(text.slice(cursor, mark.start))
    }

    parts.push(
      <span
        key={`${mark.start}-${mark.end}-${mark.type}-${index}`}
        role="button"
        tabIndex={0}
        data-subtitle-mark
        data-note={mark.note || undefined}
        title={mark.note || labelForMarkType(mark.type)}
        className={`subtitle-mark subtitle-mark-${mark.type}`}
        onClick={event => onMarkClick(event, cue, mark, index)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            event.stopPropagation()
            onMarkClick(event as unknown as React.MouseEvent, cue, mark, index)
          }
        }}
      >
        {text.slice(mark.start, mark.end)}
        {symbolForMarkType(mark.type) && (
          <span className="subtitle-mark-symbol" aria-hidden="true">
            {symbolForMarkType(mark.type)}
          </span>
        )}
      </span>
    )
    cursor = mark.end
  })

  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }

  return parts
}

function normalizeMarksForRender(
  marks: SubtitleMark[] | undefined,
  textLength: number
): SubtitleMark[] {
  if (!marks || textLength <= 0) return []

  const normalized: SubtitleMark[] = []
  let cursor = 0

  marks
    .filter(mark => mark.end > mark.start)
    .map(mark => ({
      ...mark,
      start: Math.max(0, Math.min(textLength, Math.floor(mark.start))),
      end: Math.max(0, Math.min(textLength, Math.floor(mark.end))),
    }))
    .filter(mark => mark.end > mark.start)
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .forEach(mark => {
      if (mark.start < cursor) return
      normalized.push(mark)
      cursor = mark.end
    })

  return normalized
}

function findMatchingMarkIndex(marks: SubtitleMark[], target: SubtitleMark, fallback: number): number {
  const exactIndex = marks.findIndex(mark =>
    mark.start === target.start &&
    mark.end === target.end &&
    mark.type === target.type &&
    (mark.note || '') === (target.note || '')
  )

  if (exactIndex >= 0) return exactIndex
  return Math.max(0, Math.min(fallback, marks.length - 1))
}

function labelForMarkType(type: SubtitleMarkType): string {
  if (type === 'stress') return '重读 / Stress'
  if (type === 'rise') return '升调 / Rising'
  if (type === 'fall') return '降调 / Falling'
  if (type === 'fall-rise') return '降升 / Fall-rise'
  if (type === 'linking') return '连读 / Linking'
  return '轻读 / Reduced'
}

function symbolForMarkType(type: SubtitleMarkType): string {
  if (type === 'rise') return '↗'
  if (type === 'fall') return '↘'
  if (type === 'fall-rise') return '↘↗'
  return ''
}

function clampEditorPosition(x: number, y: number): { left: number; top: number } {
  if (typeof window === 'undefined') return { left: x, top: y }
  return {
    left: Math.min(Math.max(16, x), Math.max(16, window.innerWidth - 300)),
    top: Math.min(Math.max(16, y), Math.max(16, window.innerHeight - 260)),
  }
}

function formatCueTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
