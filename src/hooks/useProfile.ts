import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

// Module-level cache — persists across page navigations within the same session
let cachedProfile: Profile | null = null

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(cachedProfile)
  const [loading, setLoading] = useState(cachedProfile === null)

  useEffect(() => {
    async function load() {
      // getSession() reads from localStorage — no network call
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setLoading(false); return }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error || !data) {
        const { data: upserted } = await supabase
          .from('profiles')
          .upsert({ id: session.user.id, day_reset_hour: 0 })
          .select()
          .single()
        cachedProfile = upserted as Profile
        setProfile(cachedProfile)
      } else {
        cachedProfile = data as Profile
        setProfile(cachedProfile)
      }
      setLoading(false)
    }
    load()
  }, [])

  const updateResetHour = useCallback(async (hour: number) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { data } = await supabase
      .from('profiles')
      .update({ day_reset_hour: hour })
      .eq('id', session.user.id)
      .select()
      .single()

    if (data) {
      cachedProfile = data as Profile
      setProfile(cachedProfile)
    }
  }, [])

  return { profile, loading, updateResetHour }
}
