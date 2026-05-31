'use client'

import { useMemo, useState } from 'react'
import { Languages, Loader2, Mic2, Plus, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { updateMaterial } from '@/lib/materials'
import { DIFFICULTY_LABELS } from '@/lib/labels'
import VoicePicker from './VoicePicker'
import {
  createEstimatedSubtitleCuesFromSentences,
  createSpeechInstructions,
  estimateSpeechDuration,
  type TtsVoice,
} from '@/lib/text-material'
import type { DifficultyLevel, Material, SubtitleCue, SubtitleMark } from '@/lib/types'

interface EditMaterialDialogProps {
  material: Material
  onClose: () => void
  onSaved: () => void
}

interface EditableCue {
  id: string
  startTime: number
  endTime: number
  text: string
  translation: string
  marks?: SubtitleMark[]
}

export default function EditMaterialDialog({ material, onClose, onSaved }: EditMaterialDialogProps) {
  const [title, setTitle] = useState(material.title)
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(material.difficulty)
  const [description, setDescription] = useState(material.description || '')
  const [tagsText, setTagsText] = useState(material.tags.join(', '))
  const [audioPath, setAudioPath] = useState(material.audioPath)
  const [duration, setDuration] = useState(material.duration)
  const [voice, setVoice] = useState<TtsVoice>('marin')
  const [cues, setCues] = useState<EditableCue[]>(() => material.subtitles.map(toEditableCue))
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [generatingSpeech, setGeneratingSpeech] = useState(false)

  const cleanSentences = useMemo(
    () => cues.map(cue => cue.text.trim()).filter(Boolean),
    [cues]
  )
  const practiceText = cleanSentences.join(' ')
  const isTextMaterial = material.source === 'text'
  const canGenerateSpeech = isTextMaterial && practiceText.length > 0 && practiceText.length <= 4096

  const updateCue = (id: string, patch: Partial<EditableCue>) => {
    setCues(current => current.map(cue => cue.id === id ? { ...cue, ...patch } : cue))
  }

  const addCueAfter = (index: number) => {
    setCues(current => {
      const previous = current[index]
      const next = current[index + 1]
      const startTime = previous?.endTime ?? 0
      const endTime = next?.startTime && next.startTime > startTime
        ? next.startTime
        : startTime + 3
      const inserted = createEmptyCue(startTime, endTime)
      return [
        ...current.slice(0, index + 1),
        inserted,
        ...current.slice(index + 1),
      ]
    })
  }

  const removeCue = (id: string) => {
    setCues(current => current.filter(cue => cue.id !== id))
  }

  const handleTranslate = async () => {
    const cueIndexes = cues
      .map((cue, index) => ({ cue, index }))
      .filter(({ cue }) => Boolean(cue.text.trim()))

    if (cueIndexes.length === 0) {
      toast.error('没有可翻译的字幕 / No subtitle text to translate')
      return
    }

    setTranslating(true)
    try {
      const response = await fetch('/api/text-material/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences: cueIndexes.map(({ cue }) => cue.text.trim()) }),
      })

      const data = await parseJsonResponse<{ translations: string[] }>(response)
      const translations = Array.isArray(data.translations) ? data.translations : []

      setCues(current => current.map((cue, index) => {
        const translatedIndex = cueIndexes.findIndex(item => item.index === index)
        if (translatedIndex < 0) return cue
        return {
          ...cue,
          translation: translations[translatedIndex] || cue.translation,
        }
      }))

      const count = translations.filter(Boolean).length
      if (count > 0) {
        toast.success(`中文翻译已生成 / ${count} lines translated`)
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

  const handleRegenerateSpeech = async () => {
    if (!canGenerateSpeech) {
      toast.error('文本为空或太长 / Text is empty or too long.')
      return
    }

    setGeneratingSpeech(true)
    try {
      const response = await fetch('/api/text-material/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: practiceText,
          mode: 'natural',
          voice,
          instructions: createSpeechInstructions('natural'),
        }),
      })

      const data = await parseJsonResponse<{ audioPath: string }>(response)
      const nextDuration = Math.round(
        await getAudioDuration(data.audioPath, estimateSpeechDuration(practiceText))
      )
      const translations = cues
        .filter(cue => Boolean(cue.text.trim()))
        .map(cue => cue.translation.trim())
      const nextCues = createEstimatedSubtitleCuesFromSentences(cleanSentences, nextDuration, translations)

      setAudioPath(data.audioPath)
      setDuration(nextDuration)
      setCues(nextCues.map(toEditableCue))
      toast.success('朗读已重新生成，保存后生效 / Speech regenerated. Save to apply.')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : '朗读生成失败 / Speech generation failed')
    } finally {
      setGeneratingSpeech(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('标题不能为空 / Title is required')
      return
    }

    setSaving(true)
    try {
      await updateMaterial(material.id, {
        title,
        difficulty,
        description,
        tags: parseTags(tagsText),
        audioPath,
        duration,
        subtitles: normalizeCuesForSave(cues),
      })

      toast.success('材料已保存 / Material saved')
      onSaved()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : '保存失败 / Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative flex max-h-[88vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-bg-secondary mx-4">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">编辑材料 / Edit Material</h2>
            <p className="mt-1 text-[12px] text-text-muted">
              修改标题、字幕和中文翻译 / Edit metadata, subtitles, and translations
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭编辑弹窗 / Close edit dialog"
            className="rounded p-1 text-text-muted transition-colors hover:text-text-secondary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <div>
              <label className="mb-1.5 block text-[11px] tracking-wider text-text-muted">标题 / Title</label>
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                className="w-full rounded-md border border-border bg-bg-inset px-3 py-2 text-[14px] text-text-primary outline-none transition-colors focus:border-border-active"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] tracking-wider text-text-muted">难度 / Difficulty</label>
              <div className="flex gap-1 rounded-md bg-bg-inset p-0.5">
                {(['beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    aria-label={`设置难度为 ${DIFFICULTY_LABELS[level].zh} / Set difficulty to ${DIFFICULTY_LABELS[level].en}`}
                    className={`flex-1 rounded px-2 py-1.5 text-[11px] transition-colors ${
                      difficulty === level
                        ? 'bg-bg-elevated text-text-primary'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {DIFFICULTY_LABELS[level].zh}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] tracking-wider text-text-muted">描述 / Description</label>
              <textarea
                value={description}
                onChange={event => setDescription(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-border bg-bg-inset px-3 py-2 text-[13px] text-text-primary outline-none transition-colors focus:border-border-active"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] tracking-wider text-text-muted">标签 / Tags</label>
              <textarea
                value={tagsText}
                onChange={event => setTagsText(event.target.value)}
                rows={3}
                placeholder="text, ai-voice"
                className="w-full resize-none rounded-md border border-border bg-bg-inset px-3 py-2 text-[13px] text-text-primary outline-none transition-colors focus:border-border-active"
              />
            </div>
          </div>

          {isTextMaterial && (
            <div className="mt-4 rounded-lg border border-border bg-bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-text-primary">AI 朗读 / AI Speech</p>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    根据当前字幕重新生成音频 / Regenerate audio from current subtitle text
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                <VoicePicker value={voice} onChange={setVoice} compact />
                <button
                  onClick={handleRegenerateSpeech}
                  disabled={generatingSpeech || !canGenerateSpeech}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[12px] font-medium text-bg-primary transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {generatingSpeech ? <Loader2 size={13} className="animate-spin" /> : <Mic2 size={13} />}
                  重新生成 / Regenerate
                </button>
              </div>
              <audio key={audioPath} controls src={audioPath} className="mt-3 w-full" />
            </div>
          )}

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-medium text-text-primary">字幕和翻译 / Subtitles</h3>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  编辑后会作为跟读和复述的句子单位 / These rows become practice units
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTranslate}
                  disabled={translating || cues.length === 0}
                  className="flex items-center gap-1.5 rounded-md bg-bg-card px-2.5 py-1.5 text-[12px] text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
                >
                  {translating ? <Loader2 size={13} className="animate-spin" /> : <Languages size={13} />}
                  生成中文 / Translate
                </button>
                <button
                  onClick={() => setCues(current => [...current, createEmptyCue(duration, duration + 3)])}
                  className="flex items-center gap-1.5 rounded-md bg-bg-card px-2.5 py-1.5 text-[12px] text-text-secondary transition-colors hover:text-text-primary"
                >
                  <Plus size={13} />
                  添加 / Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {cues.map((cue, index) => (
                <div key={cue.id} className="rounded-lg border border-border bg-bg-inset p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-text-muted">#{index + 1}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={cue.startTime}
                        onChange={event => updateCue(cue.id, { startTime: Number(event.target.value) })}
                        className="w-20 rounded border border-border bg-bg-secondary px-2 py-1 text-[11px] text-text-secondary outline-none"
                      />
                      <span className="text-[11px] text-text-muted">-</span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={cue.endTime}
                        onChange={event => updateCue(cue.id, { endTime: Number(event.target.value) })}
                        className="w-20 rounded border border-border bg-bg-secondary px-2 py-1 text-[11px] text-text-secondary outline-none"
                      />
                      <button
                        onClick={() => addCueAfter(index)}
                        aria-label={`在第 ${index + 1} 行后添加字幕 / Add subtitle after row ${index + 1}`}
                        className="rounded p-1.5 text-text-muted transition-colors hover:text-accent"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        onClick={() => removeCue(cue.id)}
                        aria-label={`删除第 ${index + 1} 行字幕 / Delete subtitle row ${index + 1}`}
                        className="rounded p-1.5 text-text-muted transition-colors hover:text-red"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={cue.text}
                    onChange={event => updateCue(cue.id, { text: event.target.value })}
                    rows={2}
                    placeholder="English subtitle..."
                    className="w-full resize-none rounded-md border border-border bg-bg-secondary px-3 py-2 text-[13px] leading-relaxed text-text-primary outline-none transition-colors focus:border-border-active"
                  />
                  <textarea
                    value={cue.translation}
                    onChange={event => updateCue(cue.id, { translation: event.target.value })}
                    rows={2}
                    placeholder="中文翻译 / Chinese translation..."
                    className="mt-2 w-full resize-none rounded-md border border-border bg-bg-secondary px-3 py-2 text-[13px] leading-relaxed text-text-secondary outline-none transition-colors focus:border-border-active"
                  />
                </div>
              ))}

              {cues.length === 0 && (
                <div className="rounded-lg border border-dashed border-border py-8 text-center">
                  <p className="text-[13px] text-text-muted">暂无字幕 / No subtitles</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-[13px] text-text-muted transition-colors hover:text-text-secondary"
          >
            取消 / Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-bg-primary transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存 / Save
          </button>
        </div>
      </div>
    </div>
  )
}

function toEditableCue(cue: SubtitleCue): EditableCue {
  return {
    id: `${cue.index}-${cue.startTime}-${Math.random().toString(36).slice(2)}`,
    startTime: cue.startTime,
    endTime: cue.endTime,
    text: cue.text,
    translation: cue.translation || '',
    marks: cue.marks,
  }
}

function createEmptyCue(startTime: number, endTime: number): EditableCue {
  return {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    startTime: roundTime(startTime),
    endTime: roundTime(Math.max(startTime + 0.1, endTime)),
    text: '',
    translation: '',
  }
}

function normalizeCuesForSave(cues: EditableCue[]): SubtitleCue[] {
  return cues
    .map((cue, index) => {
      const text = cue.text.trim()
      const translation = cue.translation.trim()
      if (!text) return null

      const startTime = Number.isFinite(cue.startTime) ? Math.max(0, cue.startTime) : 0
      const endTime = Number.isFinite(cue.endTime) ? Math.max(startTime + 0.1, cue.endTime) : startTime + 2

      return {
        index,
        startTime: roundTime(startTime),
        endTime: roundTime(endTime),
        text,
        ...(translation ? { translation } : {}),
        ...(cue.marks && cue.marks.length > 0 ? { marks: cue.marks } : {}),
      }
    })
    .filter((cue): cue is SubtitleCue => Boolean(cue))
}

function parseTags(value: string): string[] {
  return [...new Set(
    value
      .split(/[,，\n]/)
      .map(tag => tag.trim())
      .filter(Boolean)
  )]
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || 'Request failed')
  }
  return response.json() as Promise<T>
}

function getAudioDuration(url: string, fallback: number): Promise<number> {
  return new Promise(resolve => {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.src = url
    audio.addEventListener('loadedmetadata', () => resolve(audio.duration || fallback), { once: true })
    audio.addEventListener('error', () => resolve(fallback), { once: true })
  })
}

function roundTime(value: number): number {
  return Math.round(value * 100) / 100
}
