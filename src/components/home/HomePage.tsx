'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Play, ArrowRight } from 'lucide-react'
import { getAllMaterials, seedBuiltinMaterials } from '@/lib/materials'
import { getStreak, getTotalStats } from '@/lib/progress'
import type { Material, DifficultyLevel } from '@/lib/types'

const PHASE_STEPS = [
  { label: '盲听', labelEn: 'Listen', time: '3m', color: 'var(--phase-listen)' },
  { label: '精读', labelEn: 'Read', time: '3m', color: 'var(--phase-read)' },
  { label: '跟读', labelEn: 'Shadow', time: '10m', color: 'var(--phase-shadow)' },
  { label: '录音', labelEn: 'Record', time: '3m', color: 'var(--phase-record)' },
  { label: '复述', labelEn: 'Retell', time: '1m', color: 'var(--phase-retell)' },
]

export default function HomePage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [streak, setStreak] = useState(0)
  const [totalMin, setTotalMin] = useState(0)

  useEffect(() => {
    async function load() {
      await seedBuiltinMaterials()
      const [all, s, st] = await Promise.all([
        getAllMaterials(),
        getStreak(),
        getTotalStats(),
      ])
      setMaterials(all)
      setStreak(s.current)
      setTotalMin(st.totalMinutes)
    }
    load()
  }, [])

  return (
    <div className="max-w-xl mx-auto px-6 pt-20 pb-16">
      {/* Hero */}
      <header className="mb-16">
        <p className="text-[11px] uppercase tracking-[0.15em] text-text-muted mb-3">
          影子跟读法
        </p>
        <h1 className="text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-[-0.03em] leading-tight text-text-primary">
          Shadow Reading
        </h1>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed max-w-sm">
          Listen. Follow. Speak. Every day, fifteen minutes.
        </p>
      </header>

      {/* Stats */}
      <div className="flex gap-8 mb-14 text-[13px]">
        <div>
          <span className="text-text-muted block mb-0.5">streak</span>
          <span className="text-lg font-semibold tabular-nums" style={{ color: 'var(--orange)' }}>{streak}</span>
          <span className="text-text-muted ml-1">days</span>
        </div>
        <div>
          <span className="text-text-muted block mb-0.5">practiced</span>
          <span className="text-lg font-semibold tabular-nums text-accent">{materials.length}</span>
          <span className="text-text-muted ml-1">materials</span>
        </div>
        <div>
          <span className="text-text-muted block mb-0.5">total</span>
          <span className="text-lg font-semibold tabular-nums text-text-primary">{totalMin}</span>
          <span className="text-text-muted ml-1">min</span>
        </div>
      </div>

      {/* Material list */}
      <section className="mb-14">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.15em] text-text-muted">
            Materials
          </h2>
          <Link href="/materials" className="text-[11px] text-text-muted hover:text-text-secondary transition-colors">
            View all <ArrowRight size={10} className="inline ml-0.5" />
          </Link>
        </div>

        <div className="space-y-1">
          {materials.slice(0, 5).map((m) => (
            <Link
              key={m.id}
              href={`/practice/${m.id}`}
              className="group flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-bg-card transition-colors"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                  {m.title}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[12px] text-text-muted">
                  <DifficultyDot level={m.difficulty} />
                  <span>{formatDuration(m.duration)}</span>
                  {m.practiceCount > 0 && <span>{m.practiceCount}x practiced</span>}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted group-hover:text-accent group-hover:bg-accent-soft transition-all shrink-0 ml-4">
                <Play size={14} className="ml-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Method */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.15em] text-text-muted mb-5">
          Method
        </h2>
        <div className="flex items-start gap-0">
          {PHASE_STEPS.map((step, i) => (
            <div key={i} className="flex-1 relative">
              {i < PHASE_STEPS.length - 1 && (
                <div
                  className="absolute top-[9px] left-1/2 w-full h-px"
                  style={{ background: `linear-gradient(to right, ${step.color}40, ${PHASE_STEPS[i + 1].color}40)` }}
                />
              )}
              <div className="relative flex flex-col items-center">
                <div
                  className="w-[18px] h-[18px] rounded-full mb-2 flex items-center justify-center text-[9px] font-semibold"
                  style={{ background: step.color + '20', color: step.color }}
                >
                  {i + 1}
                </div>
                <span className="text-[11px] text-text-secondary font-medium">{step.labelEn}</span>
                <span className="text-[10px] text-text-muted mt-0.5">{step.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function DifficultyDot({ level }: { level: DifficultyLevel }) {
  const colors: Record<DifficultyLevel, string> = {
    beginner: 'var(--green)',
    intermediate: 'var(--orange)',
    advanced: 'var(--red)',
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors[level] }} />
      <span className="capitalize">{level}</span>
    </span>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}
