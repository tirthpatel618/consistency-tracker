import type { Habit, Completion } from '@/types'
import { toDateString, getISOWeek, getMonthKey, getPeriodKey, getCurrentPeriodKey } from '@/lib/dateUtils'

interface PeriodData {
  key: string
  label: string
  sublabel?: string
  completed: number
  required: number
  isCurrent: boolean
  dateStr?: string // daily only, for click
}

function blockColor(completed: number, required: number, isCurrent: boolean): string {
  if (completed >= required) return '#15803d'      // full — green
  if (completed > 0) {
    return completed / required >= 0.5 ? '#b45309' : '#9a3412' // amber / orange-red
  }
  return isCurrent ? '#1f2937' : '#7f1d1d'         // not-yet / missed
}

// ── Daily: 4-week calendar grid ──────────────────────────────────────────────

function buildDailyPeriods(habit: Habit, completions: Completion[]): PeriodData[] {
  const done = new Set(
    completions.filter(c => c.habit_id === habit.id).map(c => c.completed_date)
  )
  const today = new Date()
  const todayStr = toDateString(today)
  const currentPeriod = getCurrentPeriodKey('daily')

  // Start on Monday 4 weeks ago (28 days, always aligned)
  const dayOfWeek = today.getDay() || 7 // Mon=1 … Sun=7
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() - (dayOfWeek - 1))
  const startMonday = new Date(thisMonday)
  startMonday.setDate(thisMonday.getDate() - 21)

  const periods: PeriodData[] = []
  const createdAt = habit.created_at.slice(0, 10)

  for (let i = 0; i < 28; i++) {
    const d = new Date(startMonday)
    d.setDate(startMonday.getDate() + i)
    const dateStr = toDateString(d)
    const isFuture = dateStr > todayStr
    const isBeforeCreation = dateStr < createdAt
    const isCurrent = dateStr === currentPeriod
    const hasCompletion = !isFuture && done.has(dateStr)
    // Out-of-range: future, OR before creation with no completion logged
    const isOOR = isFuture || (isBeforeCreation && !hasCompletion)

    periods.push({
      key: dateStr,
      label: String(d.getDate()),
      completed: hasCompletion ? 1 : 0,
      required: 1,
      isCurrent: isOOR ? false : isCurrent,
      dateStr: isOOR ? undefined : dateStr,
      ...(isOOR ? { _oor: true } as any : {}),
    })
  }

  return periods
}

function DailyGrid({ periods, onDayClick }: { periods: PeriodData[], onDayClick?: (date: string) => void }) {
  const headers = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  return (
    <div>
      <div className="grid grid-cols-7 gap-[3px] mb-1 w-fit">
        {headers.map(h => (
          <div key={h} className="w-6 text-center text-[10px] text-muted-foreground">{h}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[3px] w-fit">
        {periods.map(p => {
          const oor = (p as any)._oor
          const bg = oor ? '#111827' : blockColor(p.completed, p.required, p.isCurrent)
          return (
            <div
              key={p.key}
              className="h-6 w-6 rounded-sm"
              style={{
                backgroundColor: bg,
                cursor: (!oor && onDayClick && p.dateStr) ? 'pointer' : 'default',
              }}
              onClick={() => !oor && onDayClick && p.dateStr && onDayClick(p.dateStr)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Weekly / Monthly: scrollable bar chart ────────────────────────────────────

function buildBarPeriods(habit: Habit, completions: Completion[]): PeriodData[] {
  const habitCompletions = completions.filter(c => c.habit_id === habit.id)
  const countByPeriod = new Map<string, number>()
  for (const c of habitCompletions) {
    const d = new Date(c.completed_date + 'T00:00:00')
    const key = getPeriodKey(d, habit.freq_type)
    countByPeriod.set(key, (countByPeriod.get(key) ?? 0) + 1)
  }

  const now = new Date()
  const currentPeriod = getCurrentPeriodKey(habit.freq_type)
  const createdAt = habit.created_at.slice(0, 10)
  const periods: PeriodData[] = []

  if (habit.freq_type === 'weekly') {
    // Last 16 weeks
    const seen = new Set<string>()
    for (let i = 15; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const key = getISOWeek(d)
      if (seen.has(key)) continue
      seen.add(key)

      // Monday of this week
      const dow = d.getDay() || 7
      const monday = new Date(d)
      monday.setDate(d.getDate() - (dow - 1))
      const mondayStr = toDateString(monday)

      if (mondayStr < createdAt) continue

      const label = monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      const completed = countByPeriod.get(key) ?? 0
      periods.push({ key, label, completed, required: habit.freq_value, isCurrent: key === currentPeriod })
    }
  } else {
    // Monthly — last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = getMonthKey(d)
      const monthStart = toDateString(d)
      if (monthStart < createdAt.slice(0, 7) + '-01') continue
      const label = d.toLocaleDateString(undefined, { month: 'short' })
      const sublabel = String(d.getFullYear()).slice(2)
      const completed = countByPeriod.get(key) ?? 0
      periods.push({ key, label, sublabel, completed, required: habit.freq_value, isCurrent: key === currentPeriod })
    }
  }

  return periods
}

const BAR_H = 56 // px

function BarChart({ periods }: { periods: PeriodData[] }) {
  if (periods.length === 0) {
    return <p className="text-xs text-muted-foreground">Not enough data yet</p>
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {periods.map(p => {
        const ratio = p.required > 0 ? Math.min(p.completed / p.required, 1) : 0
        const fillH = p.completed > 0 ? Math.max(Math.round(ratio * BAR_H), 6) : 0
        const color = blockColor(p.completed, p.required, p.isCurrent)

        return (
          <div key={p.key} className="flex flex-col items-center gap-1 flex-shrink-0 w-10">
            {/* Bar */}
            <div
              className="w-full rounded-md bg-muted relative overflow-hidden"
              style={{ height: BAR_H }}
            >
              {fillH > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-md"
                  style={{ height: fillH, backgroundColor: color }}
                />
              )}
              {/* missed — thin red line at bottom so it's visible */}
              {fillH === 0 && !p.isCurrent && (
                <div
                  className="absolute bottom-0 left-0 right-0"
                  style={{ height: 3, backgroundColor: '#7f1d1d' }}
                />
              )}
            </div>

            {/* Period label */}
            <span className="text-[10px] text-muted-foreground whitespace-nowrap leading-none">
              {p.label}
            </span>
            {p.sublabel && (
              <span className="text-[9px] text-muted-foreground leading-none">{p.sublabel}</span>
            )}

            {/* Count — only for multi-completion */}
            {p.required > 1 && (
              <span className="text-[10px] text-muted-foreground tabular-nums leading-none">
                {p.completed}/{p.required}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

interface HeatmapViewProps {
  habit: Habit
  completions: Completion[]
  onDayClick?: (date: string) => void
}

export function HeatmapView({ habit, completions, onDayClick }: HeatmapViewProps) {
  if (habit.freq_type === 'daily') {
    const periods = buildDailyPeriods(habit, completions)
    return <DailyGrid periods={periods} onDayClick={onDayClick} />
  }

  const periods = buildBarPeriods(habit, completions)
  return <BarChart periods={periods} />
}
