import { useState, useCallback, useRef } from 'react'
import { useCompletions } from './useCompletions'
import { toast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import type { ToastActionElement } from '@/components/ui/toast'
import { createElement } from 'react'
import type { PendingCompletion } from '@/types'

export function useOptimisticCompletions(startDate?: string, endDate?: string) {
  const { completions, loading, addCompletion, removeCompletion } = useCompletions(startDate, endDate)
  const [pendingMap, setPendingMap] = useState<Map<string, PendingCompletion>>(new Map())
  // Keep a ref so callbacks have access to the latest map without stale closure
  const pendingRef = useRef<Map<string, PendingCompletion>>(new Map())

  function setPending(updated: Map<string, PendingCompletion>) {
    pendingRef.current = updated
    setPendingMap(new Map(updated))
  }

  const toggle = useCallback((habitId: string, date: string, currentlyDone: boolean, isRetroactive = false) => {
    const key = `${habitId}__${date}`
    const existing = pendingRef.current.get(key)

    // Cancel existing pending if present
    if (existing) {
      clearTimeout(existing.timerId)
      const next = new Map(pendingRef.current)
      next.delete(key)
      setPending(next)
      return
    }

    const action = currentlyDone ? 'removing' : 'adding'

    const timerId = setTimeout(async () => {
      const next = new Map(pendingRef.current)
      next.delete(key)
      setPending(next)

      if (action === 'adding') {
        await addCompletion(habitId, date, isRetroactive)
      } else {
        await removeCompletion(habitId, date)
      }
    }, 5000)

    const { dismiss } = toast({
      title: action === 'adding' ? 'Habit completed!' : 'Completion removed',
      description: 'Tap undo to cancel',
      duration: 5500,
      action: createElement(ToastAction, {
        altText: 'Undo',
        onClick: () => {
          clearTimeout(timerId)
          const next = new Map(pendingRef.current)
          next.delete(key)
          setPending(next)
          dismiss()
        },
      }, 'Undo') as unknown as ToastActionElement,
    })

    const pending: PendingCompletion = { habitId, date, action, timerId, toastId: '' }
    const next = new Map(pendingRef.current)
    next.set(key, pending)
    setPending(next)
  }, [addCompletion, removeCompletion])

  const isHabitDone = useCallback((habitId: string, date: string): boolean => {
    const key = `${habitId}__${date}`
    const pending = pendingRef.current.get(key)

    const inCompletions = completions.some(c => c.habit_id === habitId && c.completed_date === date)

    if (pending?.action === 'removing') return false
    if (pending?.action === 'adding') return true
    return inCompletions
  }, [completions])

  return { completions, loading, pendingMap, toggle, isHabitDone }
}
