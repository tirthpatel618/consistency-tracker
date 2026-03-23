import type { Habit, Completion } from '@/types'
import { toDateString, getISOWeek, getMonthKey, getEffectiveDate } from './dateUtils'

function getPeriodKey(dateStr: string, freqType: 'daily' | 'weekly' | 'monthly'): string {
  const date = new Date(dateStr + 'T00:00:00')
  if (freqType === 'daily') return dateStr
  if (freqType === 'weekly') return getISOWeek(date)
  return getMonthKey(date)
}

// resetHour is only meaningful for daily habits; weekly/monthly use calendar periods
function getCurrentPeriod(freqType: 'daily' | 'weekly' | 'monthly', resetHour = 0): string {
  const now = new Date()
  if (freqType === 'daily') return getEffectiveDate(resetHour)
  if (freqType === 'weekly') return getISOWeek(now)
  return getMonthKey(now)
}

/**
 * Walk backwards from the most recent CLOSED period counting consecutive
 * periods that meet freq_value. The current open period does not break the streak.
 */
export function calcStreak(habit: Habit, completions: Completion[], resetHour = 0): number {
  const habitCompletions = completions.filter(c => c.habit_id === habit.id)
  if (habitCompletions.length === 0) return 0

  // Group by period
  const periodMap = new Map<string, number>()
  for (const c of habitCompletions) {
    const key = getPeriodKey(c.completed_date, habit.freq_type)
    periodMap.set(key, (periodMap.get(key) ?? 0) + 1)
  }

  const currentPeriod = getCurrentPeriod(habit.freq_type, resetHour)
  const sortedPeriods = Array.from(periodMap.keys()).sort().reverse()

  function prevPeriod(period: string): string {
    if (habit.freq_type === 'daily') {
      const d = new Date(period + 'T00:00:00')
      d.setDate(d.getDate() - 1)
      return toDateString(d)
    }
    if (habit.freq_type === 'weekly') {
      const [year, week] = period.split('-W').map(Number)
      const d = new Date(year, 0, 1 + (week - 1) * 7)
      d.setDate(d.getDate() - 7)
      return getISOWeek(d)
    }
    const [year, month] = period.split('-').map(Number)
    if (month === 1) return `${year - 1}-12`
    return `${year}-${String(month - 1).padStart(2, '0')}`
  }

  let streak = 0
  let checkPeriod = sortedPeriods[0] === currentPeriod
    ? (sortedPeriods[1] ?? prevPeriod(currentPeriod))
    : sortedPeriods[0]

  while (true) {
    const count = periodMap.get(checkPeriod) ?? 0
    if (count >= habit.freq_value) {
      streak++
      checkPeriod = prevPeriod(checkPeriod)
    } else {
      break
    }
  }

  return streak
}

/**
 * Consistency % = periods met / total periods in window.
 * Window start = max(created_at, 30 days ago).
 * Includes the current open period.
 */
export function calcConsistency(habit: Habit, completions: Completion[]): number {
  const habitCompletions = completions.filter(c => c.habit_id === habit.id)

  const periodMap = new Map<string, number>()
  for (const c of habitCompletions) {
    const key = getPeriodKey(c.completed_date, habit.freq_type)
    periodMap.set(key, (periodMap.get(key) ?? 0) + 1)
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const createdAt = new Date(habit.created_at)
  const start = createdAt > thirtyDaysAgo ? createdAt : thirtyDaysAgo

  const periods = new Set<string>()
  const cursor = new Date(start)
  while (cursor <= now) {
    periods.add(getPeriodKey(toDateString(cursor), habit.freq_type))
    cursor.setDate(cursor.getDate() + 1)
  }

  if (periods.size === 0) return 0

  let metPeriods = 0
  for (const p of periods) {
    if ((periodMap.get(p) ?? 0) >= habit.freq_value) metPeriods++
  }

  return Math.round((metPeriods / periods.size) * 100)
}

export interface FailedPeriod {
  period: string
  completed: number
  required: number
}

/**
 * Returns past periods (since habit.created_at) where the habit was not fully completed.
 * Excludes the current open period.
 */
export function detectFailures(habit: Habit, completions: Completion[], resetHour = 0): FailedPeriod[] {
  const habitCompletions = completions.filter(c => c.habit_id === habit.id)
  const periodMap = new Map<string, number>()
  for (const c of habitCompletions) {
    const key = getPeriodKey(c.completed_date, habit.freq_type)
    periodMap.set(key, (periodMap.get(key) ?? 0) + 1)
  }

  const createdAt = new Date(habit.created_at)
  const now = new Date()
  const currentPeriod = getCurrentPeriod(habit.freq_type, resetHour)

  const periods = new Set<string>()
  const cursor = new Date(createdAt)
  while (cursor < now) {
    const p = getPeriodKey(toDateString(cursor), habit.freq_type)
    if (p !== currentPeriod) periods.add(p)
    cursor.setDate(cursor.getDate() + 1)
  }

  const failures: FailedPeriod[] = []
  for (const p of periods) {
    const count = periodMap.get(p) ?? 0
    if (count < habit.freq_value) {
      failures.push({ period: p, completed: count, required: habit.freq_value })
    }
  }

  return failures.sort((a, b) => b.period.localeCompare(a.period))
}

/** Count completions for a habit in the current period (day/week/month). */
export function getCompletionsInCurrentPeriod(habit: Habit, completions: Completion[], selectedDate?: string): number {
  if (habit.freq_type === 'daily') {
    const date = selectedDate ?? toDateString(new Date())
    return completions.filter(c => c.habit_id === habit.id && c.completed_date === date).length
  }
  const current = getCurrentPeriod(habit.freq_type)
  return completions.filter(
    c => c.habit_id === habit.id && getPeriodKey(c.completed_date, habit.freq_type) === current
  ).length
}

export function isHabitDoneToday(habit: Habit, completions: Completion[], today: string): boolean {
  const todayCompletions = completions.filter(
    c => c.habit_id === habit.id && c.completed_date === today
  )
  return todayCompletions.length >= habit.freq_value
}

const FREQ_ORDER: Record<string, number> = { daily: 0, weekly: 1, monthly: 2 }

export function sortHabits(habits: Habit[]): Habit[] {
  return [...habits].sort((a, b) => {
    const freqDiff = FREQ_ORDER[a.freq_type] - FREQ_ORDER[b.freq_type]
    if (freqDiff !== 0) return freqDiff
    return a.sort_order - b.sort_order
  })
}
