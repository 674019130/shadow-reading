'use client'

import { useState } from 'react'
import { X, Star } from 'lucide-react'
import type { SessionAssessment } from '@/lib/types'

interface AssessmentDialogProps {
  onSubmit: (assessment: SessionAssessment) => void
  onClose: () => void
}

export default function AssessmentDialog({ onSubmit, onClose }: AssessmentDialogProps) {
  const [comprehension, setComprehension] = useState(70)
  const [syncLoss, setSyncLoss] = useState(5)
  const [speed, setSpeed] = useState(1.0)
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3)

  const handleSubmit = () => {
    onSubmit({
      comprehensionPercent: comprehension,
      syncLossCount: syncLoss,
      speed,
      notes,
      selfRating: rating,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-bg-secondary border border-border rounded-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[15px] font-semibold">Practice Complete</h2>
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-secondary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Comprehension */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-[11px] uppercase tracking-wider text-text-muted">
                Comprehension
              </label>
              <span className="text-[13px] font-mono text-accent tabular-nums">{comprehension}%</span>
            </div>
            <input
              type="range"
              min="0" max="100" step="5"
              value={comprehension}
              onChange={(e) => setComprehension(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {/* Sync loss count */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-[11px] uppercase tracking-wider text-text-muted">
                Times lost sync
              </label>
              <span className="text-[13px] font-mono text-text-secondary tabular-nums">{syncLoss}</span>
            </div>
            <input
              type="range"
              min="0" max="20" step="1"
              value={syncLoss}
              onChange={(e) => setSyncLoss(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {/* Speed used */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-2">
              Speed used
            </label>
            <div className="flex gap-1">
              {[0.5, 0.75, 1.0, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-mono transition-colors ${
                    speed === s ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Self rating */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-2">
              How did it go?
            </label>
            <div className="flex gap-1">
              {([1, 2, 3, 4, 5] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={`p-1.5 rounded transition-colors ${
                    r <= rating ? 'text-orange' : 'text-text-muted/30'
                  }`}
                >
                  <Star size={18} fill={r <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1.5">
              Notes <span className="normal-case text-text-muted/60">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What went well? What to focus on next time?"
              rows={2}
              className="w-full px-3 py-2 rounded-md bg-bg-inset border border-border text-[13px] text-text-primary placeholder:text-text-muted/40 outline-none focus:border-border-active resize-none transition-colors"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-md bg-accent text-bg-primary text-[13px] font-medium hover:bg-accent-hover transition-all"
          >
            Save Assessment
          </button>
        </div>
      </div>
    </div>
  )
}
