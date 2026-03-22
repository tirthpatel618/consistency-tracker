import { useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Habit, Completion } from '@/types'
import { calcStreak } from '@/lib/habitUtils'

interface HabitCardProps {
  habit: Habit
  done: boolean
  completions: Completion[]
  onToggle: () => void
  onLongPress?: () => void
  dragging?: boolean
}

export function HabitCard({ habit, done, completions, onToggle, onLongPress, dragging }: HabitCardProps) {
  const streak = calcStreak(habit, completions)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handlePointerDown() {
    if (!onLongPress) return
    longPressTimer.current = setTimeout(() => {
      onLongPress()
    }, 500)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const freqLabel =
    habit.freq_type === 'daily' ? (habit.freq_value === 1 ? 'Daily' : `${habit.freq_value}×/day`) :
    habit.freq_type === 'weekly' ? (habit.freq_value === 1 ? 'Weekly' : `${habit.freq_value}×/wk`) :
    (habit.freq_value === 1 ? 'Monthly' : `${habit.freq_value}×/mo`)

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border bg-card transition-all select-none',
        dragging && 'shadow-xl scale-105 opacity-90',
        done && 'opacity-60'
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onClick={onToggle}
    >
      {/* Completion ring */}
      <button
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors',
          done
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-muted-foreground'
        )}
        onClick={e => { e.stopPropagation(); onToggle() }}
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
      >
        {done && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Name and badges */}
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium truncate', done && 'line-through')}>{habit.name}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge variant="secondary" className="text-xs px-1.5 py-0">{freqLabel}</Badge>
          {habit.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">{tag}</Badge>
          ))}
        </div>
      </div>

      {/* Streak chip */}
      {streak > 0 && (
        <div className="flex-shrink-0 flex items-center gap-1 text-sm font-semibold text-orange-400">
          <span>🔥</span>
          <span>{streak}</span>
        </div>
      )}
    </div>
  )
}
