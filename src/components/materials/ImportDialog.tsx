'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileAudio, FileText, Globe, Loader2 } from 'lucide-react'
import { createMaterial } from '@/lib/materials'
import { parseSubtitles } from '@/lib/srt-parser'
import type { DifficultyLevel } from '@/lib/types'
import { toast } from 'sonner'

interface ImportDialogProps {
  onClose: () => void
  onImported: () => void
}

type ImportMode = 'file' | 'youtube'

export default function ImportDialog({ onClose, onImported }: ImportDialogProps) {
  const [mode, setMode] = useState<ImportMode>('file')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner')
  const [uploading, setUploading] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const audioInputRef = useRef<HTMLInputElement>(null)
  const subtitleInputRef = useRef<HTMLInputElement>(null)

  const handleFileSubmit = async () => {
    if (!audioFile) {
      toast.error('Please select an audio file')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioFile)
      if (subtitleFile) formData.append('subtitle', subtitleFile)

      const res = await fetch('/api/materials/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')

      const data = await res.json()
      const subtitles = data.subtitleContent ? parseSubtitles(data.subtitleContent) : []
      const duration = await getAudioDuration(data.audioPath)

      await createMaterial({
        title: title || data.title,
        difficulty,
        source: 'local',
        audioPath: data.audioPath,
        duration: Math.round(duration),
        subtitles,
      })

      toast.success('Material imported')
      onImported()
    } catch (error) {
      console.error(error)
      toast.error('Import failed')
    } finally {
      setUploading(false)
    }
  }

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL')
      return
    }

    setUploading(true)
    try {
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Download failed')
      }

      const data = await res.json()
      const subtitles = data.subtitleContent ? parseSubtitles(data.subtitleContent) : []

      await createMaterial({
        title: title || data.title,
        difficulty,
        source: 'youtube',
        audioPath: data.audioPath,
        duration: data.duration,
        subtitles,
        youtubeUrl,
      })

      toast.success('YouTube material imported')
      onImported()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'YouTube import failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-bg-secondary border border-border rounded-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold">Import Material</h2>
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-secondary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mb-5 p-0.5 bg-bg-inset rounded-md">
          <button
            onClick={() => setMode('file')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[12px] transition-colors ${
              mode === 'file' ? 'bg-bg-elevated text-text-primary' : 'text-text-muted'
            }`}
          >
            <FileAudio size={13} />
            Local File
          </button>
          <button
            onClick={() => setMode('youtube')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[12px] transition-colors ${
              mode === 'youtube' ? 'bg-bg-elevated text-text-primary' : 'text-text-muted'
            }`}
          >
            <Globe size={13} />
            YouTube
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'youtube' ? 'Auto-detected from video...' : 'Material name...'}
              className="w-full px-3 py-2 rounded-md bg-bg-inset border border-border text-[14px] text-text-primary placeholder:text-text-muted/40 outline-none focus:border-border-active transition-colors"
            />
          </div>

          {mode === 'file' ? (
            <>
              {/* Audio file */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1.5">Audio file</label>
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setAudioFile(file)
                      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
                    }
                  }}
                />
                <button
                  onClick={() => audioInputRef.current?.click()}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-dashed transition-colors text-left ${
                    audioFile ? 'border-accent/30 bg-accent-soft' : 'border-border hover:border-border-active bg-bg-inset'
                  }`}
                >
                  <FileAudio size={16} className={audioFile ? 'text-accent' : 'text-text-muted'} />
                  <span className={`text-[13px] truncate ${audioFile ? 'text-text-primary' : 'text-text-muted'}`}>
                    {audioFile ? audioFile.name : 'Select MP3, WAV, or M4A...'}
                  </span>
                </button>
              </div>

              {/* Subtitle file */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1.5">
                  Subtitles <span className="normal-case text-text-muted/60">(optional)</span>
                </label>
                <input ref={subtitleInputRef} type="file" accept=".srt,.vtt,.txt,.json" className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) setSubtitleFile(e.target.files[0]) }}
                />
                <button
                  onClick={() => subtitleInputRef.current?.click()}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-dashed transition-colors text-left ${
                    subtitleFile ? 'border-accent/30 bg-accent-soft' : 'border-border hover:border-border-active bg-bg-inset'
                  }`}
                >
                  <FileText size={16} className={subtitleFile ? 'text-accent' : 'text-text-muted'} />
                  <span className={`text-[13px] truncate ${subtitleFile ? 'text-text-primary' : 'text-text-muted'}`}>
                    {subtitleFile ? subtitleFile.name : 'Select SRT, VTT, or TXT...'}
                  </span>
                </button>
              </div>
            </>
          ) : (
            /* YouTube URL */
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1.5">YouTube URL</label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-md bg-bg-inset border border-border text-[14px] text-text-primary placeholder:text-text-muted/40 outline-none focus:border-border-active transition-colors"
              />
              <p className="text-[11px] text-text-muted/50 mt-1.5">
                Audio and English subtitles will be downloaded automatically
              </p>
            </div>
          )}

          {/* Difficulty */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1.5">Difficulty</label>
            <div className="flex gap-1">
              {(['beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-1.5 rounded-md text-[12px] capitalize transition-colors ${
                    difficulty === d ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={mode === 'file' ? handleFileSubmit : handleYoutubeSubmit}
            disabled={uploading || (mode === 'file' ? !audioFile : !youtubeUrl.trim())}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-accent text-bg-primary text-[13px] font-medium hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-2"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {mode === 'youtube' ? 'Downloading...' : 'Importing...'}
              </>
            ) : (
              <>
                <Upload size={14} />
                Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(url)
    audio.addEventListener('loadedmetadata', () => resolve(audio.duration))
    audio.addEventListener('error', () => resolve(300))
  })
}
