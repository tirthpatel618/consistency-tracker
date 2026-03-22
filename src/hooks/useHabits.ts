import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Habit } from '@/types'

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHabits = useCallback(async () => {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('archived', false)
      .order('sort_order', { ascending: true })

    if (!error && data) {
      setHabits(data as Habit[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchHabits()
  }, [fetchHabits])

  const addHabit = useCallback(async (habit: Omit<Habit, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('habits')
      .insert({ ...habit, user_id: user.id })
      .select()
      .single()

    if (!error && data) {
      setHabits(prev => [...prev, data as Habit].sort((a, b) => a.sort_order - b.sort_order))
    }
  }, [])

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    const { data, error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setHabits(prev => prev.map(h => h.id === id ? data as Habit : h))
    }
  }, [])

  const archiveHabit = useCallback(async (id: string) => {
    await supabase.from('habits').update({ archived: true }).eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
  }, [])

  const deleteHabit = useCallback(async (id: string) => {
    await supabase.from('habits').delete().eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
  }, [])

  const reorderHabits = useCallback(async (reordered: Habit[]) => {
    setHabits(reordered)
    const updates = reordered.map((h, i) => ({ id: h.id, sort_order: i, user_id: h.user_id }))
    await supabase.from('habits').upsert(updates)
  }, [])

  return { habits, loading, addHabit, updateHabit, archiveHabit, deleteHabit, reorderHabits, refetch: fetchHabits }
}
