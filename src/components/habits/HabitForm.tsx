import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import type { Habit, FreqType } from '@/types'

interface HabitFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<Habit, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  initialData?: Partial<Habit>
  habitCount?: number
}

export function HabitForm({ open, onClose, onSubmit, initialData, habitCount = 0 }: HabitFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [freqType, setFreqType] = useState<FreqType>(initialData?.freq_type ?? 'daily')
  const [freqValue, setFreqValue] = useState(initialData?.freq_value ?? 1)
  const [tags, setTags] = useState((initialData?.tags ?? []).join(', '))
  const [loading, setLoading] = useState(false)

  const maxFreq = freqType === 'daily' ? 10 : freqType === 'weekly' ? 7 : 31

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean)

    await onSubmit({
      name: name.trim(),
      freq_type: freqType,
      freq_value: freqValue,
      tags: parsedTags,
      sort_order: initialData?.sort_order ?? habitCount,
      archived: false,
    })

    setLoading(false)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{initialData?.id ? 'Edit Habit' : 'New Habit'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="habit-name">Name</Label>
            <Input
              id="habit-name"
              placeholder="e.g. Morning run"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Frequency type</Label>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as FreqType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setFreqType(type); setFreqValue(1) }}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    freqType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-secondary-foreground border-border'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Times per {freqType === 'daily' ? 'day' : freqType === 'weekly' ? 'week' : 'month'}: <span className="font-bold">{freqValue}</span></Label>
            <Slider
              min={1}
              max={maxFreq}
              step={1}
              value={[freqValue]}
              onValueChange={([v]) => setFreqValue(v)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="habit-tags">Tags (comma-separated)</Label>
            <Input
              id="habit-tags"
              placeholder="e.g. health, morning"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />
          </div>

          <SheetFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : initialData?.id ? 'Save changes' : 'Add habit'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
