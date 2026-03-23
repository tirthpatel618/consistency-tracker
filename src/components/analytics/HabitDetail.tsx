import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { HeatmapView } from './HeatmapView'
import { FailureLog } from './FailureLog'
import { StatsCard } from './StatsCard'
import { calcStreak, calcConsistency, detectFailures } from '@/lib/habitUtils'
import { getTagStyle, formatTag } from '@/lib/tagUtils'
import type { Habit, Completion } from '@/types'

interface HabitDetailProps {
  habit: Habit | null
  completions: Completion[]
  onClose: () => void
  onDayClick?: (date: string) => void
}

export function HabitDetail({ habit, completions, onClose, onDayClick }: HabitDetailProps) {
  if (!habit) return null

  const streak = calcStreak(habit, completions)
  const consistency = calcConsistency(habit, completions)
  const failures = detectFailures(habit, completions)

  return (
    <Sheet open={!!habit} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">{habit.name}</SheetTitle>
          <div className="flex gap-1 flex-wrap">
            <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground border-transparent">
              {habit.freq_type}
            </span>
            {habit.tags.map(t => (
              <span
                key={t}
                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold"
                style={getTagStyle(t)}
              >
                {formatTag(t)}
              </span>
            ))}
          </div>
        </SheetHeader>

        <div className="space-y-6">
          <div className="flex gap-3">
            <StatsCard label="Streak" value={streak} subtitle="periods" />
            <StatsCard label="Consistency" value={`${consistency}%`} subtitle="since created" />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Activity</h3>
            <HeatmapView habit={habit} completions={completions} onDayClick={onDayClick} />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Missed periods</h3>
            <FailureLog failures={failures} freqType={habit.freq_type} freqValue={habit.freq_value} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
