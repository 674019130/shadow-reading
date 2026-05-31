'use client'

import { useEffect, useRef, useState } from 'react'
import { GripHorizontal, X } from 'lucide-react'

interface TranslationPopupProps {
  text: string
  translation: string
  position: { x: number; y: number }
  onClose: () => void
}

export default function TranslationPopup({
  text,
  translation,
  position,
  onClose,
}: TranslationPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0 })
  const [pos, setPos] = useState(() => clampPosition(position.x, position.y))

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragRef.current.active) return
      setPos(clampPosition(
        event.clientX - dragRef.current.offsetX,
        event.clientY - dragRef.current.offsetY
      ))
    }

    const handlePointerUp = () => {
      dragRef.current.active = false
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const startDrag = (event: React.PointerEvent) => {
    const rect = popupRef.current?.getBoundingClientRect()
    if (!rect) return

    dragRef.current = {
      active: true,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  return (
    <div
      ref={popupRef}
      className="fixed z-[80] w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-lg border border-border bg-bg-elevated shadow-2xl"
      style={{ left: pos.x, top: pos.y }}
      role="dialog"
      aria-label="字幕翻译 / Subtitle translation"
    >
      <div
        onPointerDown={startDrag}
        className="flex cursor-grab items-center justify-between gap-3 border-b border-border bg-bg-card px-3 py-2 active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-text-muted" />
          <span className="text-[11px] font-medium text-text-secondary">翻译 / Translation</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-text-muted transition-colors hover:text-text-secondary"
          aria-label="关闭翻译 / Close translation"
        >
          <X size={14} />
        </button>
      </div>
      <div className="max-h-[52vh] overflow-y-auto px-4 py-3">
        <p className="text-[13px] leading-6 text-text-secondary">{text}</p>
        <p className="mt-3 border-t border-border-subtle pt-3 text-[15px] leading-7 text-text-primary">
          {translation}
        </p>
      </div>
    </div>
  )
}

function clampPosition(x: number, y: number): { x: number; y: number } {
  if (typeof window === 'undefined') return { x, y }

  const width = Math.min(420, window.innerWidth - 32)
  const maxX = Math.max(16, window.innerWidth - width - 16)
  const maxY = Math.max(16, window.innerHeight - 180)

  return {
    x: Math.min(Math.max(16, x), maxX),
    y: Math.min(Math.max(16, y), maxY),
  }
}
