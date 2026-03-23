import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Habit, Completion } from '@/types'

interface Props {
  date: string | null
  habits: Habit[]
  completions: Completion[]
  onClose: () => void
}

export function DayDetailSheet({ date, habits, completions, onClose }: Props) {
  if (!date) return null

  const d = new Date(date + 'T00:00:00')
  const label = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  // Completions for exactly this date
  const dayCompletions = completions.filter(c => c.completed_date === date)
  const countByHabit = new Map<string, number>()
  for (const c of dayCompletions) {
    countByHabit.set(c.habit_id, (countByHabit.get(c.habit_id) ?? 0) + 1)
  }

  // Habits that existed on this date
  const activeHabits = habits.filter(h => h.created_at.slice(0, 10) <= date)

  const doneHabits = activeHabits.filter(h => countByHabit.has(h.id))
  // Missed = daily habits that existed but weren't completed
  const missedHabits = activeHabits.filter(h => !countByHabit.has(h.id) && h.freq_type === 'daily')

  return (
    <Sheet open={!!date} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">{label}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {doneHabits.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Completed · {doneHabits.length}
              </p>
              <div className="space-y-0">
                {doneHabits.map(h => {
                  const count = countByHabit.get(h.id) ?? 0
                  return (
                    <div key={h.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="flex-1 text-sm font-medium">{h.name}</span>
                      {h.freq_value > 1 && (
                        <span className="text-xs text-muted-foreground tabular-nums">{count}/{h.freq_value}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {missedHabits.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Missed · {missedHabits.length}
              </p>
              <div className="space-y-0">
                {missedHabits.map(h => (
                  <div key={h.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 opacity-50">
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-sm">{h.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {doneHabits.length === 0 && missedHabits.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No habits active on this day.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
