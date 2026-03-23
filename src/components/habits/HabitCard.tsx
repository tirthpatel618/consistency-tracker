import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { getTagStyle, formatTag } from '@/lib/tagUtils'
import type { Habit, Completion } from '@/types'
import { calcStreak, getCompletionsInCurrentPeriod } from '@/lib/habitUtils'

interface HabitCardProps {
  habit: Habit
  done: boolean
  completions: Completion[]
  selectedDate?: string
  resetHour?: number
  onToggle: () => void
  onLongPress?: () => void
  dragging?: boolean
}

export function HabitCard({ habit, done, completions, selectedDate, resetHour = 0, onToggle, onLongPress, dragging }: HabitCardProps) {
  const streak = calcStreak(habit, completions, resetHour)
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

  const streakUnit =
    habit.freq_type === 'daily' ? 'd' :
    habit.freq_type === 'weekly' ? 'w' : 'mo'

  const periodCount = habit.freq_value > 1
    ? getCompletionsInCurrentPeriod(habit, completions, selectedDate)
    : null
  const periodLabel = periodCount !== null
    ? `${periodCount}/${habit.freq_value} ${habit.freq_type === 'daily' ? 'today' : habit.freq_type === 'weekly' ? 'this week' : 'this month'}`
    : null

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
          <span className="inline-flex items-center rounded-full border px-1.5 py-0 text-xs font-semibold bg-secondary text-secondary-foreground border-transparent">
            {freqLabel}
          </span>
          {periodLabel && (
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          )}
          {habit.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full px-1.5 py-0 text-xs font-semibold"
              style={getTagStyle(tag)}
            >
              {formatTag(tag)}
            </span>
          ))}
        </div>
      </div>

      {/* Streak chip */}
      {streak > 0 && (
        <div className="flex-shrink-0 flex items-center gap-0.5 text-sm font-semibold text-orange-400">
          <span>🔥</span>
          <span>{streak}{streakUnit}</span>
        </div>
      )}
    </div>
  )
}
