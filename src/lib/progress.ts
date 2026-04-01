import { db } from './db'
import type { PracticeSession, DailyProgress } from './types'
import { startOfDay, subDays, format, differenceInCalendarDays } from 'date-fns'

export async function getAllSessions(): Promise<PracticeSession[]> {
  return db.sessions.orderBy('startedAt').reverse().toArray()
}

export async function getSessionsByDateRange(from: string, to: string): Promise<PracticeSession[]> {
  return db.sessions
    .where('date')
    .between(from, to, true, true)
    .toArray()
}

export async function getDailyProgress(days: number = 30): Promise<DailyProgress[]> {
  const today = startOfDay(new Date())
  const from = format(subDays(today, days - 1), 'yyyy-MM-dd')
  const to = format(today, 'yyyy-MM-dd')

  const sessions = await getSessionsByDateRange(from, to)

  // Group by date
  const byDate = new Map<string, PracticeSession[]>()
  for (const s of sessions) {
    const existing = byDate.get(s.date) || []
    existing.push(s)
    byDate.set(s.date, existing)
  }

  // Generate all days in range
  const result: DailyProgress[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(today, i), 'yyyy-MM-dd')
    const daySessions = byDate.get(date) || []

    const totalMinutes = daySessions.reduce((sum, s) => {
      if (!s.phases) return sum
      return sum + s.phases.reduce((ps, p) => ps + p.duration, 0) / 60
    }, 0)

    const comprehensions = daySessions
      .filter(s => s.assessment?.comprehensionPercent != null)
      .map(s => s.assessment!.comprehensionPercent)

    const syncLosses = daySessions
      .filter(s => s.assessment?.syncLossCount != null)
      .map(s => s.assessment!.syncLossCount)

    result.push({
      date,
      sessionsCompleted: daySessions.length,
      totalMinutes: Math.round(totalMinutes * 10) / 10,
      materialsCount: new Set(daySessions.map(s => s.materialId)).size,
      avgComprehension: comprehensions.length > 0
        ? Math.round(comprehensions.reduce((a, b) => a + b, 0) / comprehensions.length)
        : 0,
      avgSyncLoss: syncLosses.length > 0
        ? Math.round(syncLosses.reduce((a, b) => a + b, 0) / syncLosses.length * 10) / 10
        : 0,
    })
  }

  return result
}

export async function getStreak(): Promise<{ current: number; longest: number }> {
  const sessions = await db.sessions.orderBy('date').reverse().toArray()
  if (sessions.length === 0) return { current: 0, longest: 0 }

  const practiceDays = [...new Set(sessions.map(s => s.date))].sort().reverse()
  const today = format(new Date(), 'yyyy-MM-dd')

  let current = 0
  let longest = 0
  let streak = 0

  // Check if practiced today or yesterday for current streak
  const lastDay = practiceDays[0]
  const daysSinceLastPractice = differenceInCalendarDays(new Date(today), new Date(lastDay))
  if (daysSinceLastPractice > 1) {
    // Streak is broken
    current = 0
  } else {
    // Count consecutive days
    for (let i = 0; i < practiceDays.length; i++) {
      if (i === 0) {
        streak = 1
        continue
      }
      const diff = differenceInCalendarDays(new Date(practiceDays[i - 1]), new Date(practiceDays[i]))
      if (diff === 1) {
        streak++
      } else {
        break
      }
    }
    current = streak
  }

  // Find longest streak
  streak = 1
  longest = 1
  for (let i = 1; i < practiceDays.length; i++) {
    const diff = differenceInCalendarDays(new Date(practiceDays[i - 1]), new Date(practiceDays[i]))
    if (diff === 1) {
      streak++
      longest = Math.max(longest, streak)
    } else {
      streak = 1
    }
  }

  return { current, longest }
}

export async function getTotalStats(): Promise<{
  totalSessions: number
  totalMinutes: number
  materialsCompleted: number
}> {
  const sessions = await db.sessions.toArray()
  const totalMinutes = sessions.reduce((sum, s) => {
    if (!s.phases) return sum
    return sum + s.phases.reduce((ps, p) => ps + p.duration, 0) / 60
  }, 0)

  return {
    totalSessions: sessions.length,
    totalMinutes: Math.round(totalMinutes),
    materialsCompleted: new Set(sessions.map(s => s.materialId)).size,
  }
}
