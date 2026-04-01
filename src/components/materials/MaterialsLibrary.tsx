'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Play, Upload, Trash2, Plus } from 'lucide-react'
import { getAllMaterials, seedBuiltinMaterials, deleteMaterial } from '@/lib/materials'
import type { Material, DifficultyLevel } from '@/lib/types'
import ImportDialog from './ImportDialog'

const DIFFICULTY_FILTERS: { value: DifficultyLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export default function MaterialsLibrary() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [filter, setFilter] = useState<DifficultyLevel | 'all'>('all')
  const [showImport, setShowImport] = useState(false)

  const loadMaterials = useCallback(async () => {
    await seedBuiltinMaterials()
    const all = await getAllMaterials()
    setMaterials(all)
  }, [])

  useEffect(() => {
    loadMaterials()
  }, [loadMaterials])

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
          <h1 className="text-xl font-semibold tracking-[-0.02em]">Materials</h1>
          <p className="text-[13px] text-text-muted mt-1">{materials.length} items</p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-card hover:bg-bg-card-hover text-[12px] text-text-secondary hover:text-text-primary transition-colors"
        >
          <Plus size={13} />
          Import
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-6">
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
                {m.practiceCount > 0 && <span>{m.practiceCount}x</span>}
                {m.source === 'youtube' && <span>YouTube</span>}
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
            <p className="text-[13px] text-text-muted">No materials yet</p>
            <button
              onClick={() => setShowImport(true)}
              className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-md bg-accent/10 text-accent text-[12px] hover:bg-accent/15 transition-colors"
            >
              <Upload size={12} />
              Import your first material
            </button>
          </div>
        )}
      </div>

      {showImport && (
        <ImportDialog
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); loadMaterials() }}
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
