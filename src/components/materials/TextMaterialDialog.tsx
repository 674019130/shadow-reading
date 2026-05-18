'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Combine, FileText, Languages, Loader2, Mic2, RefreshCw, Scissors, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { createMaterial } from '@/lib/materials'
import { DIFFICULTY_LABELS, bilingual } from '@/lib/labels'
import {
  TEXT_REVISION_MODES,
  TTS_VOICES,
  createEstimatedSubtitleCuesFromSentences,
  createSpeechInstructions,
  estimateSpeechDuration,
  normalizeTextForPractice,
  splitIntoSentences,
  type TextRevision,
  type TextRevisionMode,
  type TtsVoice,
} from '@/lib/text-material'
import type { DifficultyLevel } from '@/lib/types'

interface TextMaterialDialogProps {
  onClose: () => void
  onImported: () => void
}

interface EditableSentence {
  id: string
  text: string
  translation: string
  provider: string
}

export default function TextMaterialDialog({ onClose, onImported }: TextMaterialDialogProps) {
  const router = useRouter()
  const [inputText, setInputText] = useState('')
  const [mode, setMode] = useState<TextRevisionMode>('natural')
  const [revision, setRevision] = useState<TextRevision | null>(null)
  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner')
  const [voice, setVoice] = useState<TtsVoice>('marin')
  const [audioPath, setAudioPath] = useState('')
  const [audioDuration, setAudioDuration] = useState(0)
  const [sentenceRows, setSentenceRows] = useState<EditableSentence[]>([])
  const [checking, setChecking] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [saving, setSaving] = useState(false)
  const nextSentenceId = useRef(0)

  const normalizedInput = useMemo(() => normalizeTextForPractice(inputText), [inputText])
  const practiceText = revision?.revisedText || normalizedInput
  const confirmedSentences = useMemo(
    () => sentenceRows.map(row => row.text.trim()).filter(Boolean),
    [sentenceRows]
  )
  const confirmedTranslations = useMemo(
    () => sentenceRows.map(row => row.translation.trim()),
    [sentenceRows]
  )
  const confirmedText = confirmedSentences.join(' ')
  const estimatedDuration = estimateSpeechDuration(confirmedText || practiceText)
  const canCheck = normalizedInput.length > 0 && normalizedInput.length <= 4096
  const canGenerate = confirmedText.length > 0 && confirmedText.length <= 4096
  const hasTranslations = sentenceRows.some(row => Boolean(row.translation.trim()))

  const createSentenceRows = (text: string): EditableSentence[] => {
    return splitIntoSentences(text).map(sentence => createSentenceRow(sentence))
  }

  const createSentenceRow = (
    text: string,
    translation = '',
    provider = 'none'
  ): EditableSentence => ({
    id: `sentence-${nextSentenceId.current++}`,
    text,
    translation,
    provider,
  })

  const resetSentencesFromText = (text: string) => {
    setSentenceRows(createSentenceRows(text))
  }

  const clearGeneratedAudio = () => {
    setAudioPath('')
    setAudioDuration(0)
  }

  const handleCheck = async () => {
    if (!canCheck) {
      toast.error('请粘贴 4096 字以内的英文 / Paste up to 4096 characters.')
      return
    }

    setChecking(true)
    clearGeneratedAudio()
    try {
      const response = await fetch('/api/text-material/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: normalizedInput, mode }),
      })

      const data = await parseJsonResponse<{ revision: TextRevision }>(response)
      setRevision(data.revision)
      setTitle(data.revision.titleSuggestion)
      resetSentencesFromText(data.revision.revisedText)
      toast.success('英文已检查 / Text checked')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : '文本检查失败 / Text check failed')
    } finally {
      setChecking(false)
    }
  }

  const handleTranslate = async () => {
    if (!canGenerate) {
      toast.error('文本为空或太长 / Text is empty or too long.')
      return
    }

    setTranslating(true)
    try {
      const response = await fetch('/api/text-material/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences: confirmedSentences }),
      })

      const data = await parseJsonResponse<{
        translations: string[]
        providers: string[]
      }>(response)

      const nextTranslations = Array.isArray(data.translations) ? data.translations : []
      const nextProviders = Array.isArray(data.providers) ? data.providers : []
      setSentenceRows(rows => rows.map((row, index) => ({
        ...row,
        translation: nextTranslations[index] || row.translation,
        provider: nextProviders[index] || 'none',
      })))
      const translatedCount = nextTranslations.filter(Boolean).length

      if (translatedCount > 0) {
        toast.success(`中文翻译已生成 / ${translatedCount} lines translated`)
      } else {
        toast.error('免费翻译源暂时不可用 / Free translators are unavailable')
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : '翻译失败 / Translation failed')
    } finally {
      setTranslating(false)
    }
  }

  const handleGenerateSpeech = async () => {
    if (!canGenerate) {
      toast.error('文本为空或太长 / Text is empty or too long.')
      return
    }

    setGenerating(true)
    clearGeneratedAudio()
    try {
      const response = await fetch('/api/text-material/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: confirmedText,
          mode,
          voice,
          instructions: createSpeechInstructions(mode),
        }),
      })

      const data = await parseJsonResponse<{ audioPath: string }>(response)
      setAudioPath(data.audioPath)
      toast.success('朗读预览已生成 / Speech preview ready')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : '朗读生成失败 / Speech generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveAndPractice = async () => {
    if (!audioPath) {
      toast.error('请先生成并试听朗读 / Generate and listen first.')
      return
    }

    setSaving(true)
    try {
      const duration = Math.round(audioDuration || estimatedDuration)
      const material = await createMaterial({
        title: title.trim() || revision?.titleSuggestion || 'Pasted English Practice',
        difficulty,
        source: 'text',
        mediaType: 'audio',
        audioPath,
        duration,
        subtitles: createEstimatedSubtitleCuesFromSentences(
          confirmedSentences,
          duration,
          confirmedTranslations
        ),
        description: 'AI-generated English speech from pasted text. Voice is AI-generated, not a human recording.',
        tags: ['text', 'ai-voice'],
      })

      toast.success('文本材料已保存 / Text material saved')
      onImported()
      router.push(`/practice/${material.id}`)
    } catch (error) {
      console.error(error)
      toast.error('无法保存材料 / Could not save material')
    } finally {
      setSaving(false)
    }
  }

  const updateSentenceRow = (
    index: number,
    patch: Partial<Omit<EditableSentence, 'id'>>,
    affectsAudio = false
  ) => {
    if (affectsAudio) clearGeneratedAudio()
    setSentenceRows(rows => rows.map((row, rowIndex) => (
      rowIndex === index ? { ...row, ...patch } : row
    )))
  }

  const mergeSentenceWithPrevious = (index: number) => {
    if (index <= 0) return

    clearGeneratedAudio()
    setSentenceRows(rows => {
      const current = rows[index]
      const previous = rows[index - 1]
      if (!current || !previous) return rows

      const merged: EditableSentence = {
        ...previous,
        text: [previous.text.trim(), current.text.trim()].filter(Boolean).join(' '),
        translation: [previous.translation.trim(), current.translation.trim()].filter(Boolean).join(' '),
        provider: previous.provider === current.provider ? previous.provider : 'manual',
      }

      return [
        ...rows.slice(0, index - 1),
        merged,
        ...rows.slice(index + 1),
      ]
    })
  }

  const splitSentence = (index: number) => {
    const row = sentenceRows[index]
    if (!row) return

    const parts = splitSentenceText(row.text)
    if (!parts) {
      toast.error('这句太短，暂时不能拆 / This unit is too short to split.')
      return
    }

    clearGeneratedAudio()
    setSentenceRows(rows => [
      ...rows.slice(0, index),
      createSentenceRow(parts[0]),
      createSentenceRow(parts[1]),
      ...rows.slice(index + 1),
    ])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-bg-secondary border border-border rounded-xl w-full max-w-3xl mx-4 max-h-[88vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-[15px] font-semibold">粘贴文本 / Create from Text</h2>
            <p className="text-[12px] text-text-muted mt-1">
              先检查英文，再生成自然朗读；试听满意后再进入跟读。
              <span className="block text-text-muted/70">Check the English, generate a voice, then shadow it.</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-secondary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px] gap-5">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] tracking-wider text-text-muted">粘贴英文 / Pasted English</label>
                <span className={`text-[11px] ${normalizedInput.length > 4096 ? 'text-red' : 'text-text-muted/60'}`}>
                  {normalizedInput.length}/4096
                </span>
              </div>
              <textarea
                value={inputText}
                onChange={(event) => {
                  const nextText = event.target.value
                  setInputText(nextText)
                  setRevision(null)
                  clearGeneratedAudio()
                  resetSentencesFromText(nextText)
                }}
                placeholder="粘贴短段落、面试回答或日常表达 / Paste a short paragraph..."
                className="w-full min-h-40 resize-y px-3 py-2 rounded-md bg-bg-inset border border-border text-[14px] leading-6 text-text-primary placeholder:text-text-muted/40 outline-none focus:border-border-active transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] tracking-wider text-text-muted mb-1.5">检查模式 / Check mode</label>
              <div className="grid grid-cols-3 gap-1">
                {TEXT_REVISION_MODES.map(item => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setMode(item.value)
                      setRevision(null)
                      clearGeneratedAudio()
                      resetSentencesFromText(normalizedInput)
                    }}
                    className={`px-2 py-2 rounded-md text-left transition-colors ${
                      mode === item.value ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    <span className="block text-[12px] font-medium">{item.labelZh} / {item.label}</span>
                    <span className="block text-[10px] leading-4 text-text-muted/70 mt-0.5">
                      {item.descriptionZh}
                      <span className="block">{item.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCheck}
              disabled={checking || !canCheck}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-accent text-bg-primary text-[13px] font-medium hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {checking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              检查英文 / Check English
            </button>

            {revision && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] tracking-wider text-text-muted mb-1.5">修正版 / Revised script</label>
                  <textarea
                    value={revision.revisedText}
                    onChange={(event) => {
                      const nextText = event.target.value
                      setRevision({ ...revision, revisedText: nextText })
                      clearGeneratedAudio()
                      resetSentencesFromText(nextText)
                    }}
                    className="w-full min-h-32 resize-y px-3 py-2 rounded-md bg-bg-inset border border-border text-[14px] leading-6 text-text-primary outline-none focus:border-border-active transition-colors"
                  />
                </div>

                {revision.changes.length > 0 && (
                  <div className="rounded-lg bg-bg-inset border border-border divide-y divide-border/70">
                    {revision.changes.slice(0, 4).map((change, index) => (
                      <div key={`${change.before}-${index}`} className="p-3">
                        <p className="text-[12px] text-text-secondary">
                          <span className="text-text-muted">原文 / Before:</span> {change.before}
                        </p>
                        <p className="text-[12px] text-text-secondary mt-1">
                          <span className="text-text-muted">修改 / After:</span> {change.after}
                        </p>
                        <p className="text-[11px] text-text-muted mt-1">{change.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {sentenceRows.length > 0 && (
              <div className="rounded-lg border border-border-subtle bg-bg-inset/45 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label className="block text-[11px] tracking-wider text-text-muted">
                      分句预览 / Sentence units
                    </label>
                    <p className="mt-1 text-[11px] leading-5 text-text-muted/70">
                      每一行就是跟读和循环的最小单位。
                      <span className="block">Each row becomes one repeatable practice unit.</span>
                    </p>
                  </div>
                  <button
                    onClick={handleTranslate}
                    disabled={translating || !canGenerate}
                    className="flex shrink-0 items-center gap-1.5 rounded-md bg-bg-card px-2.5 py-1.5 text-[12px] text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {translating ? <Loader2 size={13} className="animate-spin" /> : <Languages size={13} />}
                    {hasTranslations ? '重新翻译 / Retry' : '生成翻译 / Translate'}
                  </button>
                </div>

                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {sentenceRows.map((row, index) => (
                    <div key={row.id} className="rounded-md border border-border-subtle bg-bg-secondary/70 p-2">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-text-muted/55">
                          {(index + 1).toString().padStart(2, '0')}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => mergeSentenceWithPrevious(index)}
                            disabled={index === 0}
                            className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-text-muted transition-colors hover:bg-bg-card hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <Combine size={11} />
                            合并 / Merge
                          </button>
                          <button
                            onClick={() => splitSentence(index)}
                            className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-text-muted transition-colors hover:bg-bg-card hover:text-text-secondary"
                          >
                            <Scissors size={11} />
                            拆分 / Split
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={row.text}
                        onChange={(event) => updateSentenceRow(index, { text: event.target.value }, true)}
                        rows={2}
                        className="w-full resize-y rounded-md border border-border bg-bg-inset px-2 py-1.5 text-[12px] leading-5 text-text-primary outline-none transition-colors focus:border-border-active"
                      />
                      <textarea
                        value={row.translation}
                        onChange={(event) => updateSentenceRow(index, { translation: event.target.value, provider: 'manual' })}
                        rows={2}
                        placeholder="中文翻译 / Chinese translation..."
                        className="mt-1.5 w-full resize-y rounded-md border border-border bg-bg-inset px-2 py-1.5 text-[12px] leading-5 text-text-secondary placeholder:text-text-muted/40 outline-none transition-colors focus:border-border-active"
                      />
                    </div>
                  ))}
                </div>

                <p className="mt-2 border-t border-border-subtle pt-2 text-[10px] text-text-muted/60">
                  {sentenceRows.length} 句 / {sentenceRows.length} units
                  {hasTranslations && (
                    <span className="ml-2">来源 / Source: {formatProviderSummary(sentenceRows.map(row => row.provider))}</span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] tracking-wider text-text-muted mb-1.5">标题 / Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="文本跟读练习 / Pasted English Practice"
                className="w-full px-3 py-2 rounded-md bg-bg-inset border border-border text-[14px] text-text-primary placeholder:text-text-muted/40 outline-none focus:border-border-active transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] tracking-wider text-text-muted mb-1.5">难度 / Difficulty</label>
              <div className="flex gap-1">
                {(['beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map(item => (
                  <button
                    key={item}
                    onClick={() => setDifficulty(item)}
                    className={`flex-1 py-1.5 rounded-md text-[12px] transition-colors ${
                      difficulty === item ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {bilingual(DIFFICULTY_LABELS[item])}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] tracking-wider text-text-muted mb-1.5">声音 / Voice</label>
              <div className="space-y-1">
                {TTS_VOICES.map(item => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setVoice(item.value)
                      clearGeneratedAudio()
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                      voice === item.value ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    <span>
                      <span className="block text-[12px] font-medium">{item.label}</span>
                      <span className="block text-[10px] text-text-muted/70 mt-0.5">
                        {item.descriptionZh}
                        <span className="block">{item.description}</span>
                      </span>
                    </span>
                    {voice === item.value && <Check size={13} className="text-accent" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateSpeech}
              disabled={generating || !canGenerate}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-bg-card hover:bg-bg-card-hover text-[13px] text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : audioPath ? <RefreshCw size={14} /> : <Mic2 size={14} />}
              {audioPath ? '重新生成 / Regenerate voice' : '生成试听 / Generate preview'}
            </button>

            {audioPath ? (
              <div className="rounded-lg bg-bg-inset border border-border p-3">
                <div className="flex items-center gap-2 mb-2 text-[12px] text-text-secondary">
                  <FileText size={13} className="text-accent" />
                  先试听 / Listen before saving
                </div>
                <audio
                  src={audioPath}
                  controls
                  className="w-full h-9"
                  onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration || 0)}
                />
                <p className="text-[10px] leading-4 text-text-muted/70 mt-2">
                  这是 AI 朗读。如果发音或节奏不适合跟读，可以换声音重新生成。
                  <span className="block">AI-generated voice. Regenerate if pronunciation or rhythm feels off.</span>
                </p>
              </div>
            ) : (
              <p className="text-[11px] leading-5 text-text-muted/70">
                生成的音频会成为跟读原声。预计长度：{estimatedDuration}s。
                <span className="block">The generated audio becomes your shadowing track.</span>
              </p>
            )}

            <button
              onClick={handleSaveAndPractice}
              disabled={saving || !audioPath}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-accent text-bg-primary text-[13px] font-medium hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              保存并练习 / Save & practice
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || 'Request failed')
  }
  return response.json() as Promise<T>
}

function formatProviderSummary(providers: string[]): string {
  const counts = providers
    .filter(provider => provider && provider !== 'none')
    .reduce<Map<string, number>>((map, provider) => {
      map.set(provider, (map.get(provider) || 0) + 1)
      return map
    }, new Map())

  if (counts.size === 0) return 'none'

  return [...counts.entries()]
    .map(([provider, count]) => `${provider} ${count}`)
    .join(' · ')
}

function splitSentenceText(text: string): [string, string] | null {
  const normalized = text.trim()
  if (normalized.length < 8) return null

  const punctuationBreaks = [...normalized.matchAll(/[,;:—–-]\s+/g)]
    .map(match => (match.index ?? 0) + match[0].length)
    .filter(index => isUsableSplitIndex(normalized, index))

  const splitIndex = punctuationBreaks.length > 0
    ? closestToMiddle(punctuationBreaks, normalized.length)
    : findWordSplitIndex(normalized)

  if (!splitIndex) return null

  const first = normalized.slice(0, splitIndex).trim()
  const second = normalized.slice(splitIndex).trim()
  if (!first || !second) return null

  return [first, second]
}

function findWordSplitIndex(text: string): number | null {
  const boundaries = [...text.matchAll(/\s+/g)]
    .map(match => match.index ?? 0)
    .filter(index => isUsableSplitIndex(text, index))

  return boundaries.length > 0 ? closestToMiddle(boundaries, text.length) : null
}

function closestToMiddle(indices: number[], length: number): number {
  const middle = length / 2
  return indices.reduce((best, index) => (
    Math.abs(index - middle) < Math.abs(best - middle) ? index : best
  ), indices[0])
}

function isUsableSplitIndex(text: string, index: number): boolean {
  return index >= 4 && text.length - index >= 4
}
