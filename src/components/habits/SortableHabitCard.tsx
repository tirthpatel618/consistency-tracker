import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { HabitCard } from './HabitCard'
import type { Habit, Completion } from '@/types'

interface Props {
  habit: Habit
  done: boolean
  completions: Completion[]
  selectedDate?: string
  resetHour?: number
  onToggle: () => void
  onLongPress?: () => void
}

export function SortableHabitCard({ habit, done, completions, selectedDate, resetHour, onToggle, onLongPress }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <HabitCard
        habit={habit}
        done={done}
        completions={completions}
        selectedDate={selectedDate}
        resetHour={resetHour}
        onToggle={onToggle}
        onLongPress={onLongPress}
        dragging={isDragging}
      />
    </div>
  )
}
