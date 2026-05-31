'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Check, Copy, Download, FileText, Loader2, Pencil, Play, Upload, Trash2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { deleteMaterial, duplicateMaterial, exportMaterialFile, getAllMaterials, type ExportMaterialFormat } from '@/lib/materials'
import { DIFFICULTY_LABELS, SOURCE_LABELS, bilingual } from '@/lib/labels'
import type { Material, DifficultyLevel } from '@/lib/types'
import EditMaterialDialog from './EditMaterialDialog'
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
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [duplicateTarget, setDuplicateTarget] = useState<Material | null>(null)
  const [exportTarget, setExportTarget] = useState<Material | null>(null)
  const [exportFormat, setExportFormat] = useState<ExportMaterialFormat>('bundle')
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)

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

  const handleDuplicate = async (material: Material) => {
    setDuplicatingId(material.id)
    try {
      await duplicateMaterial(material.id)
      await loadMaterials()
      toast.success('已复制副本 / Copy created')
      setDuplicateTarget(null)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : '复制失败 / Failed to copy')
    } finally {
      setDuplicatingId(null)
    }
  }

  const openExportDialog = (material: Material) => {
    setExportFormat('bundle')
    setExportTarget(material)
  }

  const handleExport = async () => {
    if (!exportTarget) return
    const material = exportTarget

    setExportingId(material.id)
    try {
      await exportMaterialFile(material.id, material.title, exportFormat)
      toast.success(exportFormat === 'text'
        ? '已导出正文 / Text exported'
        : '已导出材料 / Material exported')
      setExportTarget(null)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : '导出失败 / Failed to export')
    } finally {
      setExportingId(null)
    }
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
              <button
                onClick={(e) => { e.preventDefault(); setDuplicateTarget(m) }}
                disabled={duplicatingId === m.id}
                aria-label={`复制 ${m.title} / Duplicate ${m.title}`}
                className="p-1.5 rounded text-text-muted hover:text-accent transition-colors disabled:opacity-40"
              >
                {duplicatingId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
              </button>
              <button
                onClick={(e) => { e.preventDefault(); openExportDialog(m) }}
                disabled={exportingId === m.id}
                aria-label={`导出 ${m.title} / Export ${m.title}`}
                className="p-1.5 rounded text-text-muted hover:text-accent transition-colors disabled:opacity-40"
              >
                {exportingId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setEditingMaterial(m) }}
                aria-label={`编辑 ${m.title} / Edit ${m.title}`}
                className="p-1.5 rounded text-text-muted hover:text-accent transition-colors"
              >
                <Pencil size={13} />
              </button>
              {m.source !== 'builtin' && (
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(m.id) }}
                  aria-label={`删除 ${m.title} / Delete ${m.title}`}
                  className="p-1.5 rounded text-text-muted hover:text-red transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <Link
                href={`/practice/${m.id}`}
                aria-label={`练习 ${m.title} / Practice ${m.title}`}
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

      {editingMaterial && (
        <EditMaterialDialog
          material={editingMaterial}
          onClose={() => setEditingMaterial(null)}
          onSaved={() => {
            setEditingMaterial(null)
            void loadMaterials()
          }}
        />
      )}

      {duplicateTarget && (
        <DuplicateConfirmDialog
          material={duplicateTarget}
          busy={duplicatingId === duplicateTarget.id}
          onCancel={() => setDuplicateTarget(null)}
          onConfirm={() => { void handleDuplicate(duplicateTarget) }}
        />
      )}

      {exportTarget && (
        <ExportConfirmDialog
          material={exportTarget}
          format={exportFormat}
          busy={exportingId === exportTarget.id}
          onFormatChange={setExportFormat}
          onCancel={() => setExportTarget(null)}
          onConfirm={() => { void handleExport() }}
        />
      )}
    </div>
  )
}

function DuplicateConfirmDialog({
  material,
  busy,
  onCancel,
  onConfirm,
}: {
  material: Material
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="duplicate-title">
      <div className="absolute inset-0 bg-black/60" onClick={busy ? undefined : onCancel} />

      <div className="relative w-full max-w-sm rounded-xl border border-border bg-bg-secondary p-5 mx-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="duplicate-title" className="text-[15px] font-semibold text-text-primary">复制副本 / Duplicate</h2>
            <p className="mt-1 text-[12px] text-text-muted">
              {material.title}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={busy}
            aria-label="关闭复制确认 / Close duplicate confirmation"
            className="rounded p-1 text-text-muted transition-colors hover:text-text-secondary disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-5 text-[13px] leading-6 text-text-secondary">
          会复制字幕、中文翻译和所有发音标注 / Subtitles, translations, and pronunciation marks will be copied.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-3 py-2 text-[12px] text-text-muted transition-colors hover:bg-bg-card hover:text-text-secondary disabled:opacity-40"
          >
            取消 / Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[12px] font-medium text-bg-primary transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
            复制 / Duplicate
          </button>
        </div>
      </div>
    </div>
  )
}

function ExportConfirmDialog({
  material,
  format,
  busy,
  onFormatChange,
  onCancel,
  onConfirm,
}: {
  material: Material
  format: ExportMaterialFormat
  busy: boolean
  onFormatChange: (format: ExportMaterialFormat) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div className="absolute inset-0 bg-black/60" onClick={busy ? undefined : onCancel} />

      <div className="relative w-full max-w-md rounded-xl border border-border bg-bg-secondary p-5 mx-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="export-title" className="text-[15px] font-semibold text-text-primary">导出材料 / Export</h2>
            <p className="mt-1 text-[12px] text-text-muted">
              {material.title}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={busy}
            aria-label="关闭导出确认 / Close export confirmation"
            className="rounded p-1 text-text-muted transition-colors hover:text-text-secondary disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-5 space-y-2">
          <ExportOption
            selected={format === 'bundle'}
            icon={<Download size={15} />}
            title="完整材料包 / Full bundle"
            description=".shadow-reading.json，包含元数据、字幕、翻译、标注和本地媒体"
            onClick={() => onFormatChange('bundle')}
          />
          <ExportOption
            selected={format === 'text'}
            icon={<FileText size={15} />}
            title="纯正文 / Plain text"
            description=".txt，只导出英文字幕正文"
            onClick={() => onFormatChange('text')}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-3 py-2 text-[12px] text-text-muted transition-colors hover:bg-bg-card hover:text-text-secondary disabled:opacity-40"
          >
            取消 / Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[12px] font-medium text-bg-primary transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            导出 / Export
          </button>
        </div>
      </div>
    </div>
  )
}

function ExportOption({
  selected,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
        selected
          ? 'border-accent/50 bg-accent-soft text-text-primary'
          : 'border-border bg-bg-inset text-text-secondary hover:border-border-active'
      }`}
    >
      <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
        selected ? 'border-accent bg-accent text-bg-primary' : 'border-border text-text-muted'
      }`}>
        {selected ? <Check size={12} /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{title}</span>
        <span className="mt-1 block text-[11px] leading-5 text-text-muted">{description}</span>
      </span>
    </button>
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
