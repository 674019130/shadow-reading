'use client'

import { SPEED_OPTIONS } from '@/lib/types'

interface SpeedControlProps {
  speed: number
  onSpeedChange: (speed: number) => void
}

export default function SpeedControl({ speed, onSpeedChange }: SpeedControlProps) {
  return (
    <div className="flex items-center gap-px bg-bg-inset rounded-md p-px">
      {SPEED_OPTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onSpeedChange(s)}
          className={`
            px-2 py-1 rounded-[5px] text-[11px] font-mono transition-all
            ${speed === s
              ? 'bg-bg-elevated text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
            }
          `}
        >
          {s === 1 ? '1.0' : s}x
        </button>
      ))}
    </div>
  )
}
