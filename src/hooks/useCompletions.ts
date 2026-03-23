import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import type { Completion } from '@/types'

export function useCompletions(startDate?: string, endDate?: string) {
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCompletions = useCallback(async () => {
    let query = supabase.from('completions').select('*')
    if (startDate) query = query.gte('completed_date', startDate)
    if (endDate) query = query.lte('completed_date', endDate)

    const { data, error } = await query.order('completed_date', { ascending: false })
    if (error) {
      toast({ title: 'Failed to load completions', variant: 'destructive', duration: 3000 })
    } else if (data) {
      setCompletions(data as Completion[])
    }
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => {
    fetchCompletions()
  }, [fetchCompletions])

  const addCompletion = useCallback(async (habitId: string, date: string, isRetroactive = false) => {
    // getSession() reads from localStorage — no network call
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { data, error } = await supabase
      .from('completions')
      .insert({ habit_id: habitId, user_id: session.user.id, completed_date: date, is_retroactive: isRetroactive })
      .select()
      .single()

    if (error) {
      toast({ title: 'Failed to save completion', variant: 'destructive', duration: 3000 })
    } else if (data) {
      setCompletions(prev => [data as Completion, ...prev])
    }
  }, [])

  const removeCompletion = useCallback(async (habitId: string, date: string) => {
    // Sort by created_at desc to always remove the most recently added completion for this date
    const matches = completions
      .filter(c => c.habit_id === habitId && c.completed_date === date)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    const toDelete = matches[0]
    if (!toDelete) return

    const { error } = await supabase.from('completions').delete().eq('id', toDelete.id)
    if (error) {
      toast({ title: 'Failed to remove completion', variant: 'destructive', duration: 3000 })
    } else {
      setCompletions(prev => prev.filter(c => c.id !== toDelete.id))
    }
  }, [completions])

  return { completions, loading, addCompletion, removeCompletion, refetch: fetchCompletions }
}
