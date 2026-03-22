import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { SortableHabitCard } from '@/components/habits/SortableHabitCard'
import { HabitCard } from '@/components/habits/HabitCard'
import { HabitForm } from '@/components/habits/HabitForm'
import { BottomNav } from '@/components/layout/BottomNav'
import { useHabits } from '@/hooks/useHabits'
import { useOptimisticCompletions } from '@/hooks/useOptimisticCompletions'
import { useProfile } from '@/hooks/useProfile'
import { getEffectiveDate, getYesterdayDate, toDateString } from '@/lib/dateUtils'
import { isHabitDoneToday } from '@/lib/habitUtils'
import type { Habit } from '@/types'

export function Today() {
  const { profile, loading: profileLoading } = useProfile()
  const { habits, loading: habitsLoading, addHabit, updateHabit, reorderHabits } = useHabits()
  const [logYesterday, setLogYesterday] = useState(false)

  const today = logYesterday
    ? getYesterdayDate()
    : getEffectiveDate(profile?.day_reset_hour ?? 0)

  // Fetch completions for today + yesterday window
  const startDate = getYesterdayDate()
  const endDate = toDateString(new Date())
  const { completions, loading: completionsLoading, toggle, isHabitDone } = useOptimisticCompletions(startDate, endDate)

  const [formOpen, setFormOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const loading = profileLoading || habitsLoading || completionsLoading

  const pendingHabits = habits.filter(h => !isHabitDone(h.id, today))
  const doneHabits = habits.filter(h => isHabitDone(h.id, today))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = pendingHabits.findIndex(h => h.id === active.id)
    const newIndex = pendingHabits.findIndex(h => h.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(pendingHabits, oldIndex, newIndex)
    // Merge with done habits (done habits keep their positions after pending)
    const merged = [...reordered, ...doneHabits].map((h, i) => ({ ...h, sort_order: i }))
    reorderHabits(merged)
  }

  const dateLabel = logYesterday ? 'Yesterday' : 'Today'

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{dateLabel}</h1>
            <p className="text-xs text-muted-foreground">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="log-yesterday" className="text-sm text-muted-foreground">Yesterday</Label>
            <Switch
              id="log-yesterday"
              checked={logYesterday}
              onCheckedChange={setLogYesterday}
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))
        ) : habits.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-4xl">🎯</p>
            <p className="font-medium">No habits yet</p>
            <p className="text-sm text-muted-foreground">Tap + to add your first habit</p>
          </div>
        ) : (
          <>
            {/* Pending (sortable) */}
            {pendingHabits.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={pendingHabits.map(h => h.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {pendingHabits.map(habit => (
                      <SortableHabitCard
                        key={habit.id}
                        habit={habit}
                        done={false}
                        completions={completions}
                        onToggle={() => toggle(habit.id, today, isHabitDoneToday(habit, completions, today), logYesterday)}
                        onLongPress={() => setEditingHabit(habit)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Done section */}
            {doneHabits.length > 0 && (
              <>
                {pendingHabits.length > 0 && <Separator className="my-3" />}
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                  Done · {doneHabits.length}
                </p>
                <div className="space-y-2">
                  {doneHabits.map(habit => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      done={true}
                      completions={completions}
                      onToggle={() => toggle(habit.id, today, true, logYesterday)}
                      onLongPress={() => setEditingHabit(habit)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label="Add habit"
      >
        <Plus size={24} />
      </button>

      {/* Add habit form */}
      <HabitForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={addHabit}
        habitCount={habits.length}
      />

      {/* Edit habit form */}
      {editingHabit && (
        <HabitForm
          open={true}
          onClose={() => setEditingHabit(null)}
          onSubmit={async data => {
            await updateHabit(editingHabit.id, data)
          }}
          initialData={editingHabit}
        />
      )}

      <BottomNav />
    </div>
  )
}
