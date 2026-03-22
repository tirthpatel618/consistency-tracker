export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getEffectiveDate(dayResetHour = 0): string {
  const now = new Date()
  if (now.getHours() < dayResetHour) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return toDateString(yesterday)
  }
  return toDateString(now)
}

export function getYesterdayDate(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return toDateString(yesterday)
}

export function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // ISO week: Monday is day 1
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getPeriodKey(date: Date, freqType: 'daily' | 'weekly' | 'monthly'): string {
  if (freqType === 'daily') return toDateString(date)
  if (freqType === 'weekly') return getISOWeek(date)
  return getMonthKey(date)
}

export function getCurrentPeriodKey(freqType: 'daily' | 'weekly' | 'monthly', resetHour = 0): string {
  const now = new Date()
  if (freqType === 'daily') return getEffectiveDate(resetHour)
  if (freqType === 'weekly') return getISOWeek(now)
  return getMonthKey(now)
}

/** Returns date strings for the past N days (local time) */
export function getPastNDays(n: number): string[] {
  const dates: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(toDateString(d))
  }
  return dates
}
