'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Volume2, Loader2 } from 'lucide-react'

interface DictEntry {
  word: string
  phonetic?: string
  phonetics?: { audio?: string; text?: string }[]
  meanings: {
    partOfSpeech: string
    definitions: { definition: string; example?: string }[]
  }[]
}

interface DictionaryPopupProps {
  word: string
  position: { x: number; y: number }
  onClose: () => void
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
  const [entry, setEntry] = useState<DictEntry | null>(null)
  const [zhWord, setZhWord] = useState<string | null>(null)
  const [zhDefs, setZhDefs] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Fetch English definition + Chinese translation in parallel
  useEffect(() => {
    const cleaned = word.toLowerCase().replace(/[^a-z'-]/g, '')
    if (!cleaned) {
      setError('Not a word')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setZhWord(null)
    setZhDefs(new Map())

    // Fetch English dict + Chinese word translation in parallel
    Promise.all([
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleaned}`)
        .then(res => { if (!res.ok) throw new Error('Not found'); return res.json() })
        .then((data: DictEntry[]) => data[0]),
      fetchChineseTranslation(cleaned),
    ])
      .then(([dictEntry, zh]) => {
        setEntry(dictEntry)
        setZhWord(zh)
        setLoading(false)

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
          topDefs.reduce((chain, { key, text }) => {
            return chain.then(() =>
              fetchDefinitionTranslation(text).then(zh => {
                if (zh) {
                  setZhDefs(prev => new Map(prev).set(key, zh))
                }
              })
            )
          }, Promise.resolve())
        }
      })
      .catch(() => {
        // English dict failed, still try Chinese translation
        fetchChineseTranslation(cleaned).then(zh => {
          setZhWord(zh)
          setError(zh ? null : 'No definition found')
          setLoading(false)
        })
      })
  }, [word])

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

  const style: React.CSSProperties = {
    left: Math.min(position.x, window.innerWidth - 340),
    top: position.y + 8,
  }

  const playAudio = (url: string) => {
    new Audio(url).play()
  }

  const audioUrl = entry?.phonetics?.find(p => p.audio)?.audio
  const phoneticText = entry?.phonetic || entry?.phonetics?.find(p => p.text)?.text

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-80 bg-bg-elevated border border-border rounded-lg shadow-lg overflow-hidden"
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
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-secondary">
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
                {audioUrl && (
                  <button
                    onClick={() => playAudio(audioUrl)}
                    className="p-1 rounded text-accent hover:text-accent-hover transition-colors"
                  >
                    <Volume2 size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {phoneticText && (
                  <span className="text-[12px] text-text-muted font-mono">{phoneticText}</span>
                )}
                {zhWord && (
                  <span className="text-[13px] text-orange font-medium">{zhWord}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-text-muted hover:text-text-secondary shrink-0">
              <X size={14} />
            </button>
          </div>

          {/* Meanings */}
          {entry && (
            <div className="px-4 pb-3 pt-1 max-h-56 overflow-y-auto space-y-2.5">
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
