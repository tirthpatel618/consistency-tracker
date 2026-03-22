import { ActivityCalendar } from 'react-activity-calendar'
import type { Completion } from '@/types'
import type { Habit } from '@/types'
import { toDateString } from '@/lib/dateUtils'
import { detectFailures } from '@/lib/habitUtils'

interface HeatmapViewProps {
  habit: Habit
  completions: Completion[]
}

export function HeatmapView({ habit, completions }: HeatmapViewProps) {
  const habitCompletions = completions.filter(c => c.habit_id === habit.id)

  // Count completions per date
  const dateMap = new Map<string, number>()
  for (const c of habitCompletions) {
    dateMap.set(c.completed_date, (dateMap.get(c.completed_date) ?? 0) + 1)
  }

  // Get failure dates
  const failures = detectFailures(habit, completions, 365)
  const failureDates = new Set(failures.map(f => f.period))

  // Build activity data for the past year
  const today = new Date()
  const yearAgo = new Date(today)
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)

  const data: { date: string; count: number; level: number }[] = []

  const current = new Date(yearAgo)
  while (current <= today) {
    const dateStr = toDateString(current)
    const count = dateMap.get(dateStr) ?? 0
    const isFailure = failureDates.has(dateStr)
    const level = count >= habit.freq_value ? 4 :
                  count > 0 ? 2 :
                  isFailure ? 1 : 0

    data.push({ date: dateStr, count, level })
    current.setDate(current.getDate() + 1)
  }

  return (
    <div className="overflow-x-auto">
      <ActivityCalendar
        data={data}
        theme={{
          dark: ['#1f2937', '#7f1d1d', '#166534', '#15803d', '#4ade80'],
        }}
        colorScheme="dark"
        labels={{
          totalCount: `{{count}} completions in {{year}}`,
        }}
      />
    </div>
  )
}
