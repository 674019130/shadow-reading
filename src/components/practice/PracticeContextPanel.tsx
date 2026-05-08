'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronRight, CircleDot, Repeat, Target, Waves, X } from 'lucide-react'
import { PHASE_CONFIG } from '@/lib/types'
import { SOURCE_LABELS, bilingual } from '@/lib/labels'
import type { Material, PracticePhase, SubtitleCue } from '@/lib/types'
import type { LucideIcon } from 'lucide-react'

interface PracticeContextPanelProps {
  material: Material
  currentPhase: PracticePhase
  currentTime: number
  currentCue: SubtitleCue | null
  nextCue: SubtitleCue | null
  loopCue: SubtitleCue | null
  onCueClick: (cue: SubtitleCue) => void
  onLoopCue: (cue: SubtitleCue | null) => void
}

interface WeakSentence {
  cueIndex: number
  text: string
  issue: WeakIssue
  note: string
  createdAt: string
}

type WeakIssue = 'pronunciation' | 'linking' | 'stress' | 'rhythm' | 'meaning'

const WEAK_ISSUES: { value: WeakIssue; label: string }[] = [
  { value: 'pronunciation', label: '发音 / Pronunciation' },
  { value: 'linking', label: '连读 / Linking' },
  { value: 'stress', label: '重音 / Stress' },
  { value: 'rhythm', label: '节奏 / Rhythm' },
  { value: 'meaning', label: '理解 / Meaning' },
]

const STOPWORDS = new Set([
  'about', 'after', 'again', 'also', 'because', 'before', 'being', 'could', 'every', 'from',
  'have', 'into', 'just', 'like', 'more', 'much', 'only', 'other', 'really', 'should',
  'some', 'that', 'their', 'there', 'these', 'they', 'this', 'through', 'want', 'were',
  'what', 'when', 'where', 'which', 'with', 'would', 'your',
])

export default function PracticeContextPanel({
  material,
  currentPhase,
  currentTime,
  currentCue,
  nextCue,
  loopCue,
  onCueClick,
  onLoopCue,
}: PracticeContextPanelProps) {
  const phaseConfig = PHASE_CONFIG[currentPhase]
  const weakStorageKey = `shadow-reading:weak:${material.id}`
  const retellStorageKey = `shadow-reading:retell:${material.id}`
  const [weakIssue, setWeakIssue] = useState<WeakIssue>('pronunciation')
  const [weakNote, setWeakNote] = useState('')
  const [weakSentences, setWeakSentences] = useState<WeakSentence[]>(() => readWeakSentences(weakStorageKey))
  const [retellDraft, setRetellDraft] = useState(() => readTextValue(retellStorageKey))

  useEffect(() => {
    window.localStorage.setItem(weakStorageKey, JSON.stringify(weakSentences))
  }, [weakStorageKey, weakSentences])

  useEffect(() => {
    window.localStorage.setItem(retellStorageKey, retellDraft)
  }, [retellStorageKey, retellDraft])

  const keywords = useMemo(() => extractKeywords(material.subtitles), [material.subtitles])
  const progressPercent = material.duration > 0
    ? Math.min(100, Math.round((currentTime / material.duration) * 100))
    : 0

  const markWeakSentence = () => {
    if (!currentCue) return

    setWeakSentences(prev => {
      const existingIndex = prev.findIndex(item => item.cueIndex === currentCue.index)
      const nextItem: WeakSentence = {
        cueIndex: currentCue.index,
        text: currentCue.text,
        issue: weakIssue,
        note: weakNote.trim(),
        createdAt: new Date().toISOString(),
      }

      if (existingIndex >= 0) {
        return prev.map((item, index) => index === existingIndex ? nextItem : item)
      }

      return [nextItem, ...prev].slice(0, 8)
    })
    setWeakNote('')
  }

  const removeWeakSentence = (cueIndex: number) => {
    setWeakSentences(prev => prev.filter(item => item.cueIndex !== cueIndex))
  }

  return (
    <aside className="hidden xl:flex min-h-0 flex-col border-l border-border-subtle pl-6 py-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.16em] text-text-muted">上下文 / Context</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="w-1.5 h-1.5 rounded-full phase-glow"
              style={{ background: phaseConfig.color, color: phaseConfig.color }}
            />
            <span className="text-[13px] font-medium" style={{ color: phaseConfig.color }}>
              {phaseConfig.label} / {phaseConfig.labelEn}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] tracking-[0.16em] text-text-muted">进度 / Track</p>
          <p className="text-[13px] font-mono tabular-nums text-text-secondary mt-1">{progressPercent}%</p>
        </div>
      </div>

      <div className="mt-6 space-y-6 overflow-y-auto pr-1">
        <section>
          <SectionTitle icon={Waves} label="当前句 / Now" />
          {currentCue ? (
            <button
              onClick={() => onCueClick(currentCue)}
              className="group mt-2 w-full text-left rounded-md px-3 py-2.5 bg-bg-inset hover:bg-bg-card transition-colors"
            >
              <p className="text-[14px] leading-6 text-text-primary">{currentCue.text}</p>
              <p className="mt-2 text-[11px] font-mono text-text-muted tabular-nums">
                {formatCueTime(currentCue.startTime)} - {formatCueTime(currentCue.endTime)}
              </p>
            </button>
          ) : (
            <p className="mt-2 text-[12px] leading-5 text-text-muted">播放后这里会显示当前句。/ Play to follow the active sentence.</p>
          )}

          {nextCue && (
            <button
              onClick={() => onCueClick(nextCue)}
              className="mt-2 flex w-full items-start gap-2 text-left rounded-md px-3 py-2 hover:bg-bg-card/70 transition-colors"
            >
              <ChevronRight size={13} className="mt-1 shrink-0 text-text-muted" />
              <span className="text-[12px] leading-5 text-text-secondary">{nextCue.text}</span>
            </button>
          )}

          {currentCue && (
            <button
              onClick={() => onLoopCue(loopCue ? null : currentCue)}
              className={`mt-3 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${
                loopCue ? 'bg-accent-soft text-accent' : 'bg-bg-card text-text-secondary hover:text-text-primary'
              }`}
            >
              <Repeat size={12} />
              {loopCue ? '停止循环 / Stop loop' : '循环当前句 / Loop sentence'}
            </button>
          )}
        </section>

        <section>
          <SectionTitle icon={Target} label="弱句 / Weak Sentence" />
          <div className="mt-2 flex flex-wrap gap-1">
            {WEAK_ISSUES.map(issue => (
              <button
                key={issue.value}
                onClick={() => setWeakIssue(issue.value)}
                className={`rounded-md px-2 py-1 text-[10px] transition-colors ${
                  weakIssue === issue.value
                    ? 'bg-bg-elevated text-text-primary'
                    : 'text-text-muted hover:bg-bg-card hover:text-text-secondary'
                }`}
              >
                {issue.label}
              </button>
            ))}
          </div>
          <textarea
            value={weakNote}
            onChange={(event) => setWeakNote(event.target.value)}
            placeholder="可选备注 / Optional note..."
            className="mt-2 w-full resize-none rounded-md border border-border bg-bg-inset px-3 py-2 text-[12px] leading-5 text-text-primary placeholder:text-text-muted/40 outline-none transition-colors focus:border-border-active"
            rows={2}
          />
          <button
            onClick={markWeakSentence}
            disabled={!currentCue}
            className="mt-2 w-full rounded-md bg-bg-card px-3 py-2 text-[12px] text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            标记当前句 / Mark current sentence
          </button>

          {weakSentences.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {weakSentences.map(item => (
                <div key={item.cueIndex} className="group rounded-md bg-bg-inset px-3 py-2">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => onCueClick(material.subtitles[item.cueIndex])}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-[12px] text-text-secondary group-hover:text-text-primary">
                        {item.text}
                      </p>
                      <p className="mt-1 text-[10px] text-text-muted">{labelForWeakIssue(item.issue)}{item.note ? ` · ${item.note}` : ''}</p>
                    </button>
                    <button
                      onClick={() => removeWeakSentence(item.cueIndex)}
                      className="shrink-0 text-text-muted/60 hover:text-red transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle icon={BookOpen} label={currentPhase === 'retelling' ? '复述 / Retell' : '准备复述 / Prepare Retell'} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {keywords.map(keyword => (
              <span key={keyword} className="rounded-md bg-bg-card px-2 py-1 text-[10px] text-text-secondary">
                {keyword}
              </span>
            ))}
          </div>
          <textarea
            value={retellDraft}
            onChange={(event) => setRetellDraft(event.target.value)}
            placeholder="用 2-3 句英语复述 / Retell in 2-3 sentences..."
            className="mt-3 w-full resize-none rounded-md border border-border bg-bg-inset px-3 py-2 text-[12px] leading-5 text-text-primary placeholder:text-text-muted/40 outline-none transition-colors focus:border-border-active"
            rows={5}
          />
        </section>

        <section className="pb-4">
          <SectionTitle icon={CircleDot} label="今天 / Today" />
          <div className="mt-2 space-y-2 text-[12px] text-text-secondary">
            <ContextMetric label="目标 / Target" value="20 min" />
            <ContextMetric label="来源 / Source" value={bilingual(SOURCE_LABELS[material.source])} />
            <ContextMetric label="长度 / Length" value={formatDuration(material.duration)} />
          </div>
        </section>
      </div>
    </aside>
  )
}

function SectionTitle({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} className="text-text-muted" />
      <h2 className="text-[10px] tracking-[0.16em] text-text-muted">{label}</h2>
    </div>
  )
}

function ContextMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-subtle pb-2">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-secondary">{value}</span>
    </div>
  )
}

function labelForWeakIssue(issue: WeakIssue): string {
  return WEAK_ISSUES.find(item => item.value === issue)?.label || issue
}

function formatCueTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return `${s}s`
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function extractKeywords(subtitles: SubtitleCue[]): string[] {
  const counts = new Map<string, number>()
  const text = subtitles.map(cue => cue.text).join(' ').toLowerCase()
  const words = text.match(/[a-z][a-z'-]{3,}/g) || []

  for (const word of words) {
    const normalized = word.replace(/^'+|'+$/g, '')
    if (STOPWORDS.has(normalized)) continue
    counts.set(normalized, (counts.get(normalized) || 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([word]) => word)
}

function readWeakSentences(key: string): WeakSentence[] {
  if (typeof window === 'undefined') return []

  try {
    const saved = window.localStorage.getItem(key)
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readTextValue(key: string): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) || ''
}
