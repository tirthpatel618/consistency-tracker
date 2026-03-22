export type FreqType = 'daily' | 'weekly' | 'monthly'

export interface Habit {
  id: string
  user_id: string
  name: string
  freq_type: FreqType
  freq_value: number
  tags: string[]
  sort_order: number
  archived: boolean
  created_at: string
}

export interface Completion {
  id: string
  habit_id: string
  user_id: string
  completed_date: string
  is_retroactive: boolean
  created_at: string
}

export interface Profile {
  id: string
  day_reset_hour: number
  created_at: string
}

export interface PendingCompletion {
  habitId: string
  date: string
  action: 'adding' | 'removing'
  timerId: ReturnType<typeof setTimeout>
  toastId: string
}
