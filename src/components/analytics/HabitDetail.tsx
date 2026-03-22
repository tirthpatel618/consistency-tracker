import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { HeatmapView } from './HeatmapView'
import { FailureLog } from './FailureLog'
import { StatsCard } from './StatsCard'
import { calcStreak, calcConsistency, detectFailures } from '@/lib/habitUtils'
import type { Habit, Completion } from '@/types'

interface HabitDetailProps {
  habit: Habit | null
  completions: Completion[]
  onClose: () => void
}

export function HabitDetail({ habit, completions, onClose }: HabitDetailProps) {
  if (!habit) return null

  const streak = calcStreak(habit, completions)
  const consistency = calcConsistency(habit, completions)
  const failures = detectFailures(habit, completions, 90)

  return (
    <Sheet open={!!habit} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">{habit.name}</SheetTitle>
          <div className="flex gap-1 flex-wrap">
            <Badge variant="secondary">{habit.freq_type}</Badge>
            {habit.tags.map(t => <Badge key={t} variant="outline">{t}</Badge>)}
          </div>
        </SheetHeader>

        <div className="space-y-6">
          <div className="flex gap-3">
            <StatsCard label="Streak" value={streak} subtitle="periods" />
            <StatsCard label="Consistency" value={`${consistency}%`} subtitle="last 30 days" />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Activity</h3>
            <HeatmapView habit={habit} completions={completions} />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Missed periods</h3>
            <FailureLog failures={failures} freqType={habit.freq_type} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
