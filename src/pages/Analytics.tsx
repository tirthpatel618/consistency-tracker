import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/analytics/StatsCard'
import { HabitDetail } from '@/components/analytics/HabitDetail'
import { BottomNav } from '@/components/layout/BottomNav'
import { useHabits } from '@/hooks/useHabits'
import { useCompletions } from '@/hooks/useCompletions'
import { calcStreak, calcConsistency } from '@/lib/habitUtils'
import type { Habit } from '@/types'

export function Analytics() {
  const { habits, loading: habitsLoading } = useHabits()
  const { completions, loading: completionsLoading } = useCompletions()
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null)
  const [activeTag, setActiveTag] = useState('All')

  const loading = habitsLoading || completionsLoading

  // Compute global stats
  const highestStreak = habits.reduce((max, h) => Math.max(max, calcStreak(h, completions)), 0)
  const overallConsistency = habits.length > 0
    ? Math.round(habits.reduce((sum, h) => sum + calcConsistency(h, completions), 0) / habits.length)
    : 0
  const totalCompletions = completions.length

  // Unique tags
  const allTags = ['All', ...Array.from(new Set(habits.flatMap(h => h.tags)))]

  const filteredHabits = activeTag === 'All'
    ? habits
    : habits.filter(h => h.tags.includes(activeTag))

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
              <StatsCard label="Consistency" value={`${overallConsistency}%`} subtitle="30 days avg" />
              <StatsCard label="Completions" value={totalCompletions} subtitle="all time" />
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
                      {tag}
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
                            <Badge variant="secondary" className="text-xs">{habit.freq_type}</Badge>
                            {habit.tags.map(t => (
                              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
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
      />

      <BottomNav />
    </div>
  )
}
