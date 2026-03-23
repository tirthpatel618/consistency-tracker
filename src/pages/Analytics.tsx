import { useState, useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsCard } from '@/components/analytics/StatsCard'
import { HabitDetail } from '@/components/analytics/HabitDetail'
import { DayDetailSheet } from '@/components/analytics/DayDetailSheet'
import { BottomNav } from '@/components/layout/BottomNav'
import { useHabits } from '@/hooks/useHabits'
import { useCompletions } from '@/hooks/useCompletions'
import { calcStreak, calcConsistency } from '@/lib/habitUtils'
import { getTagStyle, formatTag } from '@/lib/tagUtils'
import { toDateString } from '@/lib/dateUtils'
import type { Habit } from '@/types'

export function Analytics() {
  const { habits, loading: habitsLoading } = useHabits()

  const { startDate, endDate } = useMemo(() => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - 400)
    return { startDate: toDateString(start), endDate: toDateString(end) }
  }, [])

  const { completions, loading: completionsLoading } = useCompletions(startDate, endDate)
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null)
  const [activeTag, setActiveTag] = useState('All')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const loading = habitsLoading || completionsLoading

  // Compute global stats
  const highestStreak = habits.reduce((max, h) => Math.max(max, calcStreak(h, completions)), 0)
  const overallConsistency = habits.length > 0
    ? Math.round(habits.reduce((sum, h) => sum + calcConsistency(h, completions), 0) / habits.length)
    : 0
  const activeStreaks = habits.filter(h => calcStreak(h, completions) > 0).length

  // Unique tags
  const allTags = ['All', ...Array.from(new Set(habits.flatMap(h => h.tags)))]

  const FREQ_ORDER: Record<string, number> = { daily: 0, weekly: 1, monthly: 2 }
  const sortedHabits = [...habits].sort((a, b) => {
    const fd = FREQ_ORDER[a.freq_type] - FREQ_ORDER[b.freq_type]
    return fd !== 0 ? fd : a.sort_order - b.sort_order
  })

  const filteredHabits = (activeTag === 'All' ? sortedHabits : sortedHabits.filter(h => h.tags.includes(activeTag)))

  return (
    <div className="min-h-screen pb-32">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold">Analytics</h1>
      </div>

      <div className="px-4 py-4 space-y-6">
        {loading ? (
          <>
            <div className="flex gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="flex-1 h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-10 rounded-xl" />
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </>
        ) : (
          <>
            {/* Global stats */}
            <div className="flex gap-3">
              <StatsCard label="Best streak" value={highestStreak} subtitle="periods" />
              <StatsCard label="Consistency" value={`${overallConsistency}%`} subtitle="all time avg" />
              <StatsCard label="Active streaks" value={activeStreaks} subtitle={`of ${habits.length} habits`} />
            </div>

            {/* Tag filter */}
            {allTags.length > 1 && (
              <Tabs value={activeTag} onValueChange={setActiveTag}>
                <TabsList className="w-full overflow-x-auto flex justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
                  {allTags.map(tag => (
                    <TabsTrigger
                      key={tag}
                      value={tag}
                      className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {tag === 'All' ? 'All' : formatTag(tag)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {/* Habit cards */}
            {filteredHabits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No habits found</div>
            ) : (
              <div className="space-y-3">
                {filteredHabits.map(habit => {
                  const streak = calcStreak(habit, completions)
                  const consistency = calcConsistency(habit, completions)

                  return (
                    <button
                      key={habit.id}
                      onClick={() => setSelectedHabit(habit)}
                      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="font-medium truncate">{habit.name}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center rounded-full border px-1.5 py-0 text-xs font-semibold bg-secondary text-secondary-foreground border-transparent">
                              {habit.freq_type}
                            </span>
                            {habit.tags.map(t => (
                              <span
                                key={t}
                                className="inline-flex items-center rounded-full px-1.5 py-0 text-xs font-semibold"
                                style={getTagStyle(t)}
                              >
                                {formatTag(t)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right space-y-1">
                          {streak > 0 && (
                            <p className="text-sm font-bold text-orange-400">🔥 {streak}</p>
                          )}
                          <p className="text-sm text-muted-foreground">{consistency}%</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <HabitDetail
        habit={selectedHabit}
        completions={completions}
        onClose={() => setSelectedHabit(null)}
        onDayClick={date => { setSelectedHabit(null); setSelectedDay(date) }}
      />

      <DayDetailSheet
        date={selectedDay}
        habits={habits}
        completions={completions}
        onClose={() => setSelectedDay(null)}
      />

      <BottomNav />
    </div>
  )
}
