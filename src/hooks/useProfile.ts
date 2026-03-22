import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error || !data) {
        // Upsert profile if it doesn't exist
        const { data: upserted } = await supabase
          .from('profiles')
          .upsert({ id: user.id, day_reset_hour: 0 })
          .select()
          .single()
        setProfile(upserted)
      } else {
        setProfile(data as Profile)
      }
      setLoading(false)
    }
    load()
  }, [])

  const updateResetHour = useCallback(async (hour: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .update({ day_reset_hour: hour })
      .eq('id', user.id)
      .select()
      .single()

    if (data) setProfile(data as Profile)
  }, [])

  return { profile, loading, updateResetHour }
}
