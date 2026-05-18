'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Volume2, Loader2 } from 'lucide-react'

interface DictEntry {
  word: string
  phonetic?: string
  phonetics?: DictPhonetic[]
  meanings: {
    partOfSpeech: string
    definitions: { definition: string; example?: string }[]
  }[]
}

interface DictPhonetic {
  audio?: string
  text?: string
  sourceUrl?: string
}

interface PronunciationItem {
  key: string
  label: string
  text: string | null
  audio: string | null
}

interface LookupState {
  word: string
  entry: DictEntry | null
  zhWord: string | null
  zhDefs: Map<string, string>
  error: string | null
}

interface DictionaryPopupProps {
  word: string
  position: { x: number; y: number }
  onClose: () => void
}

const EMPTY_DEFS = new Map<string, string>()
const POPUP_WIDTH = 320
const VIEWPORT_MARGIN = 16
const ANCHOR_GAP = 8

interface PopupPlacement {
  left: number
  top: number
  maxHeight: number
  bodyMaxHeight: number
}

async function fetchChineseTranslation(word: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh`
    )
    if (!res.ok) return null
    const data = await res.json()
    const translated = data?.responseData?.translatedText
    if (!translated || translated === word) return null
    return translated
  } catch {
    return null
  }
}

async function fetchDefinitionTranslation(definition: string): Promise<string | null> {
  try {
    // Only translate the first short definition for speed
    const text = definition.length > 100 ? definition.slice(0, 100) : definition
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.responseData?.translatedText || null
  } catch {
    return null
  }
}

export default function DictionaryPopup({ word, position, onClose }: DictionaryPopupProps) {
  const cleanedWord = word.toLowerCase().replace(/[^a-z'-]/g, '')
  const [lookup, setLookup] = useState<LookupState | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Fetch English definition + Chinese translation in parallel
  useEffect(() => {
    if (!cleanedWord) return
    let cancelled = false

    async function loadDefinition() {
      try {
        const [dictEntry, zh] = await Promise.all([
          fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanedWord}`)
            .then(res => { if (!res.ok) throw new Error('Not found'); return res.json() })
            .then((data: DictEntry[]) => data[0]),
          fetchChineseTranslation(cleanedWord),
        ])

        if (cancelled) return

        setLookup({
          word: cleanedWord,
          entry: dictEntry,
          zhWord: zh,
          zhDefs: new Map(),
          error: null,
        })

        // Then fetch Chinese translations for top definitions (non-blocking)
        if (dictEntry) {
          const topDefs: { key: string; text: string }[] = []
          for (const meaning of dictEntry.meanings.slice(0, 3)) {
            for (const def of meaning.definitions.slice(0, 2)) {
              const key = `${meaning.partOfSpeech}-${def.definition.slice(0, 30)}`
              topDefs.push({ key, text: def.definition })
            }
          }
          // Translate definitions one by one to avoid rate limits
          for (const { key, text } of topDefs) {
            const zh = await fetchDefinitionTranslation(text)
            if (cancelled) return
            if (zh) {
              setLookup(prev => {
                if (!prev || prev.word !== cleanedWord) return prev
                return {
                  ...prev,
                  zhDefs: new Map(prev.zhDefs).set(key, zh),
                }
              })
            }
          }
        }
      } catch {
        // English dict failed, still try Chinese translation
        const zh = await fetchChineseTranslation(cleanedWord)
        if (cancelled) return
        setLookup({
          word: cleanedWord,
          entry: null,
          zhWord: zh,
          zhDefs: new Map(),
          error: zh ? null : 'No definition found',
        })
      }
    }

    void loadDefinition()
    return () => {
      cancelled = true
    }
  }, [cleanedWord])

  // Close on click outside / Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleKey)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const placement = getPopupPlacement(position, 360)

  const style: React.CSSProperties = {
    left: placement.left,
    top: placement.top,
    maxHeight: placement.maxHeight,
  }

  const playAudio = (url: string) => {
    new Audio(url).play()
  }

  const hasCurrentLookup = lookup?.word === cleanedWord
  const entry = hasCurrentLookup ? lookup.entry : null
  const zhWord = hasCurrentLookup ? lookup.zhWord : null
  const zhDefs = hasCurrentLookup ? lookup.zhDefs : EMPTY_DEFS
  const loading = Boolean(cleanedWord) && !hasCurrentLookup
  const error = cleanedWord ? (hasCurrentLookup ? lookup.error : null) : 'Not a word'

  const pronunciations = getPronunciations(entry)

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-label="Dictionary lookup"
      className="fixed z-50 w-[min(20rem,calc(100vw-2rem))] bg-bg-elevated border border-border rounded-lg shadow-lg overflow-hidden"
      style={style}
    >
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="text-text-muted animate-spin" />
        </div>
      ) : error && !zhWord ? (
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-text-primary">{word}</p>
            <p className="text-[12px] text-text-muted mt-0.5">{error}</p>
          </div>
          <button onClick={onClose} aria-label="Close dictionary" className="p-1 text-text-muted hover:text-text-secondary">
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-4 pt-3 pb-1 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-semibold text-text-primary">
                  {entry?.word || word}
                </span>
              </div>
              <div className="mt-1.5 space-y-1">
                {pronunciations.length > 0 && (
                  <div className="space-y-1">
                    {pronunciations.map(item => {
                      const audio = item.audio
                      return (
                        <div key={item.key} className="flex items-center gap-2 text-[12px]">
                          <span className="min-w-7 rounded bg-bg-inset px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                            {item.label}
                          </span>
                          {item.text ? (
                            <span className="font-mono text-text-muted">{item.text}</span>
                          ) : (
                            <span className="text-text-muted/70">audio</span>
                          )}
                          {audio && (
                            <button
                              onClick={() => playAudio(audio)}
                              className="rounded p-0.5 text-accent transition-colors hover:text-accent-hover"
                              aria-label={`Play ${item.label} pronunciation for ${entry?.word || word}`}
                            >
                              <Volume2 size={13} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {zhWord && (
                  <span className="block text-[13px] text-orange font-medium">{zhWord}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close dictionary" className="p-1 text-text-muted hover:text-text-secondary shrink-0">
              <X size={14} />
            </button>
          </div>

          {/* Meanings */}
          {entry && (
            <div
              className="px-4 pb-3 pt-1 overflow-y-auto space-y-2.5"
              style={{ maxHeight: placement.bodyMaxHeight }}
            >
              {entry.meanings.slice(0, 3).map((meaning, mi) => (
                <div key={mi}>
                  <span className="text-[10px] uppercase tracking-wider text-accent/70">
                    {meaning.partOfSpeech}
                  </span>
                  <ol className="mt-1 space-y-1.5">
                    {meaning.definitions.slice(0, 2).map((def, di) => {
                      const zhKey = `${meaning.partOfSpeech}-${def.definition.slice(0, 30)}`
                      const zhDef = zhDefs.get(zhKey)
                      return (
                        <li key={di} className="pl-3 relative">
                          <span className="absolute left-0 text-text-muted/40 text-[11px]">{di + 1}.</span>
                          <p className="text-[13px] text-text-secondary leading-relaxed">
                            {def.definition}
                          </p>
                          {zhDef && (
                            <p className="text-[12px] text-text-muted mt-0.5">
                              {zhDef}
                            </p>
                          )}
                          {def.example && (
                            <p className="text-[12px] text-text-muted/60 italic mt-0.5">
                              &ldquo;{def.example}&rdquo;
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

function getPronunciations(entry: DictEntry | null): PronunciationItem[] {
  if (!entry) return []

  const items = (entry.phonetics || [])
    .map((phonetic, index) => {
      const label = inferPronunciationLabel(phonetic, index)
      return {
        key: `${label}-${phonetic.text || ''}-${phonetic.audio || index}`,
        label,
        text: cleanPhoneticText(phonetic.text),
        audio: phonetic.audio || null,
      }
    })
    .filter(item => item.text || item.audio)

  const merged = new Map<string, PronunciationItem>()
  for (const item of items) {
    const key = `${item.label}-${item.text || ''}`
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, item)
      continue
    }

    if (!existing.audio && item.audio) {
      merged.set(key, { ...existing, audio: item.audio })
    }
  }

  const pronunciations = [...merged.values()]
    .sort((a, b) => pronunciationRank(a.label) - pronunciationRank(b.label))

  if (pronunciations.length > 0) return pronunciations

  const fallback = cleanPhoneticText(entry.phonetic)
  return fallback
    ? [{ key: `ipa-${fallback}`, label: 'IPA', text: fallback, audio: null }]
    : []
}

function inferPronunciationLabel(phonetic: DictPhonetic, index: number): string {
  const source = `${phonetic.audio || ''} ${phonetic.sourceUrl || ''}`.toLowerCase()
  if (source.includes('-us') || source.includes('_us') || source.includes('us.')) return 'US'
  if (source.includes('-uk') || source.includes('_uk') || source.includes('uk.')) return 'UK'
  return index === 0 ? 'IPA' : `IPA ${index + 1}`
}

function pronunciationRank(label: string): number {
  if (label === 'US') return 0
  if (label === 'UK') return 1
  if (label === 'IPA') return 2
  return 3
}

function cleanPhoneticText(text: string | undefined): string | null {
  const cleaned = text?.trim()
  return cleaned || null
}

function getPopupPlacement(
  position: { x: number; y: number },
  popupHeight: number
): PopupPlacement {
  if (typeof window === 'undefined') {
    return {
      left: position.x,
      top: position.y + ANCHOR_GAP,
      maxHeight: 360,
      bodyMaxHeight: 224,
    }
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const usableWidth = Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2)
  const width = Math.min(POPUP_WIDTH, usableWidth)
  const left = clamp(position.x, VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN)
  const spaceBelow = viewportHeight - position.y - ANCHOR_GAP - VIEWPORT_MARGIN
  const spaceAbove = position.y - ANCHOR_GAP - VIEWPORT_MARGIN
  const placeBelow = spaceBelow >= Math.min(popupHeight, 260) || spaceBelow >= spaceAbove
  const maxHeight = Math.max(180, Math.min(460, placeBelow ? spaceBelow : spaceAbove))
  const height = Math.min(popupHeight, maxHeight)
  const top = placeBelow
    ? position.y + ANCHOR_GAP
    : Math.max(VIEWPORT_MARGIN, position.y - ANCHOR_GAP - height)

  return {
    left,
    top,
    maxHeight,
    bodyMaxHeight: Math.max(110, maxHeight - 92),
  }
}
