import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import type { Habit } from '@/types'

// Module-level cache — persists across page navigations within the same session
let cachedHabits: Habit[] | null = null

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>(cachedHabits ?? [])
  const [loading, setLoading] = useState(cachedHabits === null)

  const fetchHabits = useCallback(async () => {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('archived', false)
      .order('sort_order', { ascending: true })

    if (error) {
      toast({ title: 'Failed to load habits', variant: 'destructive', duration: 3000 })
    } else if (data) {
      cachedHabits = data as Habit[]
      setHabits(cachedHabits)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchHabits()
  }, [fetchHabits])

  const addHabit = useCallback(async (habit: Omit<Habit, 'id' | 'user_id' | 'created_at'>) => {
    // getSession() reads from localStorage — no network call
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { data, error } = await supabase
      .from('habits')
      .insert({ ...habit, user_id: session.user.id })
      .select()
      .single()

    if (error) {
      toast({ title: 'Failed to add habit', variant: 'destructive', duration: 3000 })
    } else if (data) {
      const updated = [...(cachedHabits ?? []), data as Habit].sort((a, b) => a.sort_order - b.sort_order)
      cachedHabits = updated
      setHabits(updated)
    }
  }, [])

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    const { data, error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      toast({ title: 'Failed to update habit', variant: 'destructive', duration: 3000 })
    } else if (data) {
      const updated = (cachedHabits ?? habits).map(h => h.id === id ? data as Habit : h)
      cachedHabits = updated
      setHabits(updated)
    }
  }, [habits])

  const archiveHabit = useCallback(async (id: string) => {
    const { error } = await supabase.from('habits').update({ archived: true }).eq('id', id)
    if (error) {
      toast({ title: 'Failed to archive habit', variant: 'destructive', duration: 3000 })
    } else {
      const updated = (cachedHabits ?? habits).filter(h => h.id !== id)
      cachedHabits = updated
      setHabits(updated)
    }
  }, [habits])

  const deleteHabit = useCallback(async (id: string) => {
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (error) {
      toast({ title: 'Failed to delete habit', variant: 'destructive', duration: 3000 })
    } else {
      const updated = (cachedHabits ?? habits).filter(h => h.id !== id)
      cachedHabits = updated
      setHabits(updated)
    }
  }, [habits])

  const reorderHabits = useCallback(async (reordered: Habit[]) => {
    cachedHabits = reordered
    setHabits(reordered)
    const updates = reordered.map((h, i) => ({ id: h.id, sort_order: i, user_id: h.user_id }))
    const { error } = await supabase.from('habits').upsert(updates)
    if (error) {
      toast({ title: 'Failed to save order', variant: 'destructive', duration: 3000 })
    }
  }, [])

  return { habits, loading, addHabit, updateHabit, archiveHabit, deleteHabit, reorderHabits, refetch: fetchHabits }
}
