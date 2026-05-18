'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Play, Upload, Trash2, Plus } from 'lucide-react'
import { deleteMaterial, getAllMaterials } from '@/lib/materials'
import { DIFFICULTY_LABELS, SOURCE_LABELS, bilingual } from '@/lib/labels'
import type { Material, DifficultyLevel } from '@/lib/types'
import ImportDialog from './ImportDialog'
import TextMaterialDialog from './TextMaterialDialog'

const DIFFICULTY_FILTERS: { value: DifficultyLevel | 'all'; label: string }[] = [
  { value: 'all', label: '全部 / All' },
  { value: 'beginner', label: bilingual(DIFFICULTY_LABELS.beginner) },
  { value: 'intermediate', label: bilingual(DIFFICULTY_LABELS.intermediate) },
  { value: 'advanced', label: bilingual(DIFFICULTY_LABELS.advanced) },
]

export default function MaterialsLibrary() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [filter, setFilter] = useState<DifficultyLevel | 'all'>('all')
  const [showImport, setShowImport] = useState(false)
  const [showTextImport, setShowTextImport] = useState(false)

  const loadMaterials = useCallback(async () => {
    const all = await getAllMaterials()
    setMaterials(all)
  }, [])

  useEffect(() => {
    let cancelled = false

    getAllMaterials().then(all => {
      if (!cancelled) setMaterials(all)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handleDelete = async (id: string) => {
    await deleteMaterial(id)
    await loadMaterials()
  }

  const filtered = filter === 'all'
    ? materials
    : materials.filter(m => m.difficulty === filter)

  return (
    <div className="max-w-xl mx-auto px-6 pt-12 pb-16">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em]">材料库 / Materials</h1>
          <p className="text-[13px] text-text-muted mt-1">{materials.length} 个材料 / {materials.length} items</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowTextImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent/10 hover:bg-accent/15 text-[12px] text-accent transition-colors"
          >
            <FileText size={13} />
            文本 / Text
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-card hover:bg-bg-card-hover text-[12px] text-text-secondary hover:text-text-primary transition-colors"
          >
            <Plus size={13} />
            导入 / Import
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-1 mb-6">
        {DIFFICULTY_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`
              px-2.5 py-1 rounded-md text-[11px] transition-colors
              ${filter === value
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Material list */}
      <div className="space-y-px">
        {filtered.map((m) => (
          <div
            key={m.id}
            className="group flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-bg-card transition-colors"
          >
            <Link href={`/practice/${m.id}`} className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                {m.title}
              </p>
              <div className="flex items-center gap-3 mt-1 text-[12px] text-text-muted">
                <DifficultyDot level={m.difficulty} />
                <span>{formatDuration(m.duration)}</span>
                {m.mediaType === 'video' && <span>视频 / Video</span>}
                {m.practiceCount > 0 && <span>{m.practiceCount} 次 / {m.practiceCount}x</span>}
                {m.source !== 'local' && <span>{bilingual(SOURCE_LABELS[m.source])}</span>}
              </div>
            </Link>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {m.source !== 'builtin' && (
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(m.id) }}
                  className="p-1.5 rounded text-text-muted hover:text-red transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <Link
                href={`/practice/${m.id}`}
                className="p-1.5 rounded text-text-muted hover:text-accent transition-colors"
              >
                <Play size={14} className="ml-0.5" />
              </Link>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-[13px] text-text-muted">还没有材料 / No materials yet</p>
            <button
              onClick={() => setShowImport(true)}
              className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-md bg-accent/10 text-accent text-[12px] hover:bg-accent/15 transition-colors"
            >
              <Upload size={12} />
              导入第一个材料 / Import first material
            </button>
          </div>
        )}
      </div>

      {showImport && (
        <ImportDialog
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false)
            void loadMaterials()
          }}
        />
      )}

      {showTextImport && (
        <TextMaterialDialog
          onClose={() => setShowTextImport(false)}
          onImported={() => {
            setShowTextImport(false)
            void loadMaterials()
          }}
        />
      )}
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
      <span>{DIFFICULTY_LABELS[level].zh}</span>
      <span className="text-text-muted/70">{DIFFICULTY_LABELS[level].en}</span>
    </span>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}
