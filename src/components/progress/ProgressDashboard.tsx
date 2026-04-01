'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { getDailyProgress, getStreak, getTotalStats, getAllSessions } from '@/lib/progress'
import type { DailyProgress, PracticeSession } from '@/lib/types'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

export default function ProgressDashboard() {
  const [dailyData, setDailyData] = useState<DailyProgress[]>([])
  const [streak, setStreak] = useState({ current: 0, longest: 0 })
  const [stats, setStats] = useState({ totalSessions: 0, totalMinutes: 0, materialsCompleted: 0 })
  const [sessions, setSessions] = useState<PracticeSession[]>([])

  useEffect(() => {
    async function load() {
      const [daily, s, st, sess] = await Promise.all([
        getDailyProgress(30),
        getStreak(),
        getTotalStats(),
        getAllSessions(),
      ])
      setDailyData(daily)
      setStreak(s)
      setStats(st)
      setSessions(sess)
    }
    load()
  }, [])

  const chartData = dailyData.filter(d => d.sessionsCompleted > 0)

  return (
    <div className="max-w-2xl mx-auto px-6 pt-12 pb-16 space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Progress</h1>
        <p className="text-[13px] text-text-muted mt-1">Track your shadow reading journey</p>
      </div>

      {/* Stats row */}
      <div className="flex gap-8 text-[13px]">
        <div>
          <span className="text-text-muted block mb-0.5">current streak</span>
          <span className="text-lg font-semibold tabular-nums" style={{ color: 'var(--orange)' }}>
            {streak.current}
          </span>
          <span className="text-text-muted ml-1">days</span>
        </div>
        <div>
          <span className="text-text-muted block mb-0.5">longest streak</span>
          <span className="text-lg font-semibold tabular-nums text-text-primary">{streak.longest}</span>
          <span className="text-text-muted ml-1">days</span>
        </div>
        <div>
          <span className="text-text-muted block mb-0.5">total sessions</span>
          <span className="text-lg font-semibold tabular-nums text-accent">{stats.totalSessions}</span>
        </div>
        <div>
          <span className="text-text-muted block mb-0.5">total time</span>
          <span className="text-lg font-semibold tabular-nums text-text-primary">{stats.totalMinutes}</span>
          <span className="text-text-muted ml-1">min</span>
        </div>
      </div>

      {/* Streak calendar (last 30 days) */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.15em] text-text-muted mb-3">
          Last 30 Days
        </h2>
        <div className="flex gap-[3px] flex-wrap">
          {dailyData.map((d) => {
            const intensity = d.sessionsCompleted > 0
              ? Math.min(d.totalMinutes / 20, 1) // normalize to max 20 min
              : 0
            return (
              <div
                key={d.date}
                className="w-4 h-4 rounded-sm transition-colors"
                style={{
                  background: intensity > 0
                    ? `oklch(72% ${0.12 * intensity} 185 / ${0.2 + intensity * 0.8})`
                    : 'var(--bg-card)',
                }}
                title={`${d.date}: ${d.sessionsCompleted} sessions, ${d.totalMinutes} min`}
              />
            )
          })}
        </div>
      </section>

      {/* Charts */}
      {chartData.length > 1 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.15em] text-text-muted mb-4">
            Comprehension Trend
          </h2>
          <div className="h-48 bg-bg-inset rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickFormatter={(v) => format(parseISO(v), 'M/d')}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgComprehension"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--accent)', r: 3 }}
                  name="Comprehension %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Session history */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.15em] text-text-muted mb-3">
          Session History
        </h2>
        {sessions.length === 0 ? (
          <p className="text-[13px] text-text-muted/60 py-8 text-center">
            No practice sessions yet. Start your first session!
          </p>
        ) : (
          <div className="space-y-1">
            {sessions.slice(0, 20).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-md hover:bg-bg-card/50 transition-colors"
              >
                <div>
                  <span className="text-[13px] text-text-primary">
                    {format(parseISO(s.startedAt), 'MMM d, HH:mm')}
                  </span>
                  {s.assessment && (
                    <span className="text-[11px] text-text-muted ml-2">
                      {s.assessment.comprehensionPercent}% comprehension
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  {s.assessment && (
                    <>
                      <span>{s.assessment.speed}x</span>
                      <span>{'★'.repeat(s.assessment.selfRating)}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
