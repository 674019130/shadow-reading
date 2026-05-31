'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Pause, Volume2 } from 'lucide-react'
import { TTS_VOICES, type TtsVoice, type TtsVoiceOption } from '@/lib/text-material'

interface VoicePickerProps {
  value: TtsVoice
  onChange: (voice: TtsVoice) => void
  compact?: boolean
}

export default function VoicePicker({ value, onChange, compact = false }: VoicePickerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [previewVoice, setPreviewVoice] = useState<TtsVoiceOption | null>(null)
  const [playingVoice, setPlayingVoice] = useState<TtsVoice | null>(null)

  useEffect(() => {
    if (!previewVoice) return

    const audio = audioRef.current
    if (!audio) return

    void audio.play()
      .then(() => setPlayingVoice(previewVoice.value))
      .catch(() => {
        setPlayingVoice(null)
        setPreviewVoice(null)
      })
  }, [previewVoice])

  const togglePreview = (voice: TtsVoiceOption) => {
    if (playingVoice === voice.value) {
      audioRef.current?.pause()
      setPlayingVoice(null)
      setPreviewVoice(null)
      return
    }

    setPlayingVoice(null)
    setPreviewVoice(voice)
  }

  return (
    <>
      <div className={compact ? 'grid grid-cols-1 gap-1.5 sm:grid-cols-2' : 'space-y-1'}>
        {TTS_VOICES.map(item => {
          const isSelected = value === item.value
          const isPlaying = playingVoice === item.value

          return (
            <div
              key={item.value}
              className={`flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors ${
                isSelected ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:bg-bg-card/60 hover:text-text-secondary'
              }`}
            >
              <button
                type="button"
                onClick={() => onChange(item.value)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block text-[12px] font-medium">{item.label}</span>
                <span className="mt-0.5 block text-[10px] leading-4 text-text-muted/70">
                  {item.descriptionZh}
                  {!compact && <span className="block">{item.description}</span>}
                </span>
              </button>

              <button
                type="button"
                onClick={() => togglePreview(item)}
                aria-label={`试听 ${item.label} / Preview ${item.label}`}
                title={`试听 ${item.label} / Preview ${item.label}`}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors ${
                  isPlaying ? 'bg-accent text-bg-primary' : 'bg-bg-inset text-text-muted hover:text-text-primary'
                }`}
              >
                {isPlaying ? <Pause size={13} /> : <Volume2 size={13} />}
              </button>

              {isSelected && <Check size={13} className="shrink-0 text-accent" />}
            </div>
          )
        })}
      </div>
      <audio
        ref={audioRef}
        src={previewVoice?.previewPath}
        preload="none"
        onEnded={() => setPlayingVoice(null)}
        onError={() => setPlayingVoice(null)}
      />
    </>
  )
}
