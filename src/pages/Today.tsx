import { useState, useRef, useEffect } from 'react'
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
import { ChevronDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { SortableHabitCard } from '@/components/habits/SortableHabitCard'
import { HabitCard } from '@/components/habits/HabitCard'
import { HabitForm } from '@/components/habits/HabitForm'
import { BottomNav } from '@/components/layout/BottomNav'
import { useHabits } from '@/hooks/useHabits'
import { useOptimisticCompletions } from '@/hooks/useOptimisticCompletions'
import { useProfile } from '@/hooks/useProfile'
import { getEffectiveDate, toDateString, getPeriodKey } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'
import type { Habit, Completion, PendingCompletion } from '@/types'

const FREQ_ORDER: Record<string, number> = { daily: 0, weekly: 1, monthly: 2 }

function buildDateOptions(todayEffective: string): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = []
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const val = toDateString(d)
    const label =
      i === 0 ? 'Today' :
      i === 1 ? 'Yesterday' :
      d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    options.push({ label: i === 0 ? (val === todayEffective ? 'Today' : 'Today') : label, value: val })
  }
  return options
}

/**
 * Period-aware done check. Daily: exact date. Weekly/monthly: counts all
 * completions in the same period and adjusts for any pending operations.
 */
function isEffectivelyDone(
  habit: Habit,
  completions: Completion[],
  pendingMap: Map<string, PendingCompletion>,
  date: string,
): boolean {
  if (habit.freq_type === 'daily') {
    const key = `${habit.id}__${date}`
    const pending = pendingMap.get(key)
    if (pending?.action === 'removing') return false
    if (pending?.action === 'adding') return true
    return completions.some(c => c.habit_id === habit.id && c.completed_date === date)
  }

  const d = new Date(date + 'T00:00:00')
  const periodKey = getPeriodKey(d, habit.freq_type)

  let count = completions.filter(c => {
    if (c.habit_id !== habit.id) return false
    return getPeriodKey(new Date(c.completed_date + 'T00:00:00'), habit.freq_type) === periodKey
  }).length

  // Adjust for pending ops in the same period
  for (const [key, pending] of pendingMap) {
    const [pendingHabitId, pendingDate] = key.split('__')
    if (pendingHabitId !== habit.id) continue
    if (getPeriodKey(new Date(pendingDate + 'T00:00:00'), habit.freq_type) !== periodKey) continue
    if (pending.action === 'adding') count++
    if (pending.action === 'removing') count--
  }

  return count >= habit.freq_value
}

/**
 * For weekly/monthly habits being un-done, find the actual completion date to
 * pass to removeCompletion (it may differ from selectedDate).
 */
function getRemovalDate(habit: Habit, completions: Completion[], date: string): string {
  if (habit.freq_type === 'daily') return date
  const d = new Date(date + 'T00:00:00')
  const periodKey = getPeriodKey(d, habit.freq_type)
  const inPeriod = completions
    .filter(c => {
      if (c.habit_id !== habit.id) return false
      return getPeriodKey(new Date(c.completed_date + 'T00:00:00'), habit.freq_type) === periodKey
    })
    .sort((a, b) => b.completed_date.localeCompare(a.completed_date))
  return inPeriod[0]?.completed_date ?? date
}

export function Today() {
  const { profile, loading: profileLoading } = useProfile()
  const { habits, loading: habitsLoading, addHabit, updateHabit, reorderHabits } = useHabits()
  const resetHour = profile?.day_reset_hour ?? 0

  const effectiveToday = getEffectiveDate(resetHour)
  const [selectedDate, setSelectedDate] = useState<string>(effectiveToday)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profileLoading) setSelectedDate(effectiveToday)
  }, [effectiveToday, profileLoading])

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const dateOptions = buildDateOptions(effectiveToday)
  const selectedOption = dateOptions.find(o => o.value === selectedDate) ?? dateOptions[0]
  const isRetroactive = selectedDate !== effectiveToday

  // 35-day window: covers full current month for monthly habit period checks
  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setDate(windowStart.getDate() - 35)
  const startDate = toDateString(windowStart)
  const endDate = toDateString(now)

  const { completions, loading: completionsLoading, pendingMap, toggle } = useOptimisticCompletions(startDate, endDate)

  const [formOpen, setFormOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [activeTab, setActiveTab] = useState<'todo' | 'done'>('todo')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const loading = profileLoading || habitsLoading || completionsLoading

  const sortedHabits = [...habits].sort((a, b) => {
    const freqDiff = FREQ_ORDER[a.freq_type] - FREQ_ORDER[b.freq_type]
    return freqDiff !== 0 ? freqDiff : a.sort_order - b.sort_order
  })

  const pendingHabits = sortedHabits.filter(h => !isEffectivelyDone(h, completions, pendingMap, selectedDate))
  const doneHabits = sortedHabits.filter(h => isEffectivelyDone(h, completions, pendingMap, selectedDate))

  const allTags = Array.from(new Set(habits.flatMap(h => h.tags)))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = pendingHabits.findIndex(h => h.id === active.id)
    const newIndex = pendingHabits.findIndex(h => h.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(pendingHabits, oldIndex, newIndex)
    const merged = [...reordered, ...doneHabits].map((h, i) => ({ ...h, sort_order: i }))
    reorderHabits(merged)
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div ref={pickerRef} className="relative inline-block">
          <button
            onClick={() => setPickerOpen(p => !p)}
            className="flex items-center gap-1.5 group"
          >
            <h1 className={cn(
              'text-xl font-bold',
              isRetroactive && 'text-muted-foreground'
            )}>
              {selectedOption.label}
            </h1>
            <ChevronDown
              size={16}
              className={cn(
                'text-muted-foreground transition-transform',
                pickerOpen && 'rotate-180'
              )}
            />
          </button>

          {pickerOpen && (
            <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50 min-w-[180px]">
              {dateOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSelectedDate(opt.value); setPickerOpen(false) }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors',
                    opt.value === selectedDate && 'font-semibold text-primary'
                  )}
                >
                  {opt.label}
                  {opt.value === effectiveToday && opt.value !== selectedDate && (
                    <span className="ml-1 text-xs text-muted-foreground">(current)</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {isRetroactive && (
          <p className="text-xs text-muted-foreground mt-0.5">{selectedDate} · retroactive</p>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))
        ) : habits.length === 0 ? (
          <button
            onClick={() => setFormOpen(true)}
            className="w-full text-center py-20 flex flex-col items-center gap-2"
          >
            <p className="text-4xl">🎯</p>
            <p className="font-medium">No habits yet</p>
            <p className="text-sm text-muted-foreground">Tap anywhere to add your first habit</p>
          </button>
        ) : (
          <>
            {/* Todo / Done tabs */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setActiveTab('todo')}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                  activeTab === 'todo'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                Todo{pendingHabits.length > 0 && ` · ${pendingHabits.length}`}
              </button>
              <button
                onClick={() => setActiveTab('done')}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                  activeTab === 'done'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                Done{doneHabits.length > 0 && ` · ${doneHabits.length}`}
              </button>
            </div>

            {activeTab === 'todo' && (
              <>
                {pendingHabits.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">All done for {selectedOption.label.toLowerCase()}!</p>
                ) : (
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
                            selectedDate={selectedDate}
                            resetHour={resetHour}
                            onToggle={() => toggle(habit.id, selectedDate, false, isRetroactive)}
                            onLongPress={() => setEditingHabit(habit)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
                <button
                  onClick={() => setFormOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <span className="text-lg leading-none">+</span>
                  <span className="text-sm">Add habit</span>
                </button>
              </>
            )}

            {activeTab === 'done' && (
              doneHabits.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Nothing completed yet</p>
              ) : (
                <div className="space-y-2">
                  {doneHabits.map(habit => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      done={true}
                      completions={completions}
                      selectedDate={selectedDate}
                      resetHour={resetHour}
                      onToggle={() => toggle(habit.id, getRemovalDate(habit, completions, selectedDate), true, isRetroactive)}
                      onLongPress={() => setEditingHabit(habit)}
                    />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      <HabitForm
        key={formOpen ? 'add-open' : 'add-closed'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={addHabit}
        habitCount={habits.length}
        allTags={allTags}
      />

      {editingHabit && (
        <HabitForm
          open={true}
          onClose={() => setEditingHabit(null)}
          onSubmit={async data => { await updateHabit(editingHabit.id, data) }}
          initialData={editingHabit}
          allTags={allTags}
        />
      )}

      <BottomNav />
    </div>
  )
}
