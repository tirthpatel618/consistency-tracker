import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { HabitForm } from '@/components/habits/HabitForm'
import { BottomNav } from '@/components/layout/BottomNav'
import { useProfile } from '@/hooks/useProfile'
import { useHabits } from '@/hooks/useHabits'
import { supabase } from '@/lib/supabase'
import type { Habit } from '@/types'

export function Settings() {
  const navigate = useNavigate()
  const { profile, updateResetHour } = useProfile()
  const { habits, updateHabit, archiveHabit, deleteHabit, refetch } = useHabits()
  const [resetHour, setResetHour] = useState(0)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [allHabits, setAllHabits] = useState<Habit[]>([])

  useEffect(() => {
    if (profile) setResetHour(profile.day_reset_hour)
  }, [profile])

  // Fetch ALL habits (including archived) for settings view
  useEffect(() => {
    async function fetchAll() {
      const { data } = await supabase
        .from('habits')
        .select('*')
        .order('sort_order', { ascending: true })
      if (data) setAllHabits(data as Habit[])
    }
    fetchAll()
  }, [habits])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  async function handleDeleteAccount() {
    await supabase.rpc('delete_user')
    await supabase.auth.signOut()
    navigate('/auth')
  }

  async function handleArchive(habit: Habit) {
    if (habit.archived) {
      await updateHabit(habit.id, { archived: false })
    } else {
      await archiveHabit(habit.id)
    }
    const { data } = await supabase.from('habits').select('*').order('sort_order')
    if (data) setAllHabits(data as Habit[])
    refetch()
  }

  // Unique tags across all habits
  const allTags = Array.from(new Set(allHabits.flatMap(h => h.tags)))

  return (
    <div className="min-h-screen pb-32">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="px-4 py-4 space-y-8">
        {/* Day Reset Hour */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Day Reset</h2>
          <div className="space-y-3">
            <p className="font-medium">
              Resets at <span className="text-primary">{String(resetHour).padStart(2, '0')}:00</span>
            </p>
            <Slider
              min={0}
              max={23}
              step={1}
              value={[resetHour]}
              onValueChange={([v]) => setResetHour(v)}
              onValueCommit={([v]) => updateResetHour(v)}
            />
            <p className="text-xs text-muted-foreground">
              Habits before this hour count toward the previous day
            </p>
          </div>
        </section>

        <Separator />

        {/* Manage Habits */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Manage Habits</h2>
          {allHabits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No habits yet</p>
          ) : (
            <div className="space-y-2">
              {allHabits.map(habit => (
                <div key={habit.id} className="flex items-center gap-2 p-3 border border-border rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${habit.archived ? 'line-through text-muted-foreground' : ''}`}>
                      {habit.name}
                    </p>
                    <div className="flex gap-1 mt-0.5">
                      <Badge variant="secondary" className="text-xs">{habit.freq_type}</Badge>
                      {habit.archived && <Badge variant="outline" className="text-xs">archived</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingHabit(habit)}
                      className="text-xs h-8"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleArchive(habit)}
                      className="text-xs h-8"
                    >
                      {habit.archived ? 'Restore' : 'Archive'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-xs h-8 text-destructive hover:text-destructive">
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete habit?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{habit.name}" and all its completion history.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteHabit(habit.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tags */}
        {allTags.length > 0 && (
          <>
            <Separator />
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-sm px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            </section>
          </>
        )}

        <Separator />

        {/* Account */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Account</h2>
          <div className="space-y-3">
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              Sign out
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">Delete account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes your account and all data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </div>

      {/* Edit habit form */}
      {editingHabit && (
        <HabitForm
          open={true}
          onClose={() => setEditingHabit(null)}
          onSubmit={async data => {
            await updateHabit(editingHabit.id, data)
            setEditingHabit(null)
          }}
          initialData={editingHabit}
        />
      )}

      <BottomNav />
    </div>
  )
}
