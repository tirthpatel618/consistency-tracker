import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Completion } from '@/types'

export function useCompletions(startDate?: string, endDate?: string) {
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCompletions = useCallback(async () => {
    let query = supabase.from('completions').select('*')

    if (startDate) query = query.gte('completed_date', startDate)
    if (endDate) query = query.lte('completed_date', endDate)

    const { data, error } = await query.order('completed_date', { ascending: false })

    if (!error && data) {
      setCompletions(data as Completion[])
    }
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => {
    fetchCompletions()
  }, [fetchCompletions])

  const addCompletion = useCallback(async (habitId: string, date: string, isRetroactive = false) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('completions')
      .insert({ habit_id: habitId, user_id: user.id, completed_date: date, is_retroactive: isRetroactive })
      .select()
      .single()

    if (!error && data) {
      setCompletions(prev => [data as Completion, ...prev])
    }
  }, [])

  const removeCompletion = useCallback(async (habitId: string, date: string) => {
    // Find the completion to delete
    const toDelete = completions.find(c => c.habit_id === habitId && c.completed_date === date)
    if (!toDelete) return

    await supabase.from('completions').delete().eq('id', toDelete.id)
    setCompletions(prev => prev.filter(c => c.id !== toDelete.id))
  }, [completions])

  return { completions, loading, addCompletion, removeCompletion, refetch: fetchCompletions }
}
