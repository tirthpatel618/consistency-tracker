import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { getTagStyle, formatTag } from '@/lib/tagUtils'
import type { Habit, FreqType } from '@/types'

interface HabitFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<Habit, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  initialData?: Partial<Habit>
  habitCount?: number
  allTags?: string[]
}

export function HabitForm({ open, onClose, onSubmit, initialData, habitCount = 0, allTags = [] }: HabitFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [freqType, setFreqType] = useState<FreqType>(initialData?.freq_type ?? 'daily')
  const initialFreqValue = (initialData?.freq_type === 'daily' ? 1 : initialData?.freq_value) ?? 1
  const [freqValue, setFreqValue] = useState(initialFreqValue)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(initialData?.tags ?? []))
  const [newTagInput, setNewTagInput] = useState('')
  const [showNewTagInput, setShowNewTagInput] = useState(false)
  const [loading, setLoading] = useState(false)

  const maxFreq = freqType === 'daily' ? 10 : freqType === 'weekly' ? 7 : 31

  function toggleTag(tag: string) {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  function addNewTag() {
    const tag = newTagInput.trim().toLowerCase()
    if (!tag) return
    setSelectedTags(prev => new Set([...prev, tag]))
    setNewTagInput('')
    setShowNewTagInput(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    await onSubmit({
      name: name.trim(),
      freq_type: freqType,
      freq_value: freqValue,
      tags: Array.from(selectedTags),
      sort_order: initialData?.sort_order ?? habitCount,
      archived: false,
    })

    setLoading(false)
    onClose()
  }

  // Combine existing tags from all habits with any newly created tags
  const availableTags = Array.from(new Set([...allTags, ...selectedTags]))

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
            <Label>Frequency</Label>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as FreqType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setFreqType(type); setFreqValue(1) }}
                  className={cn(
                    'flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors',
                    freqType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-secondary-foreground border-border'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {freqType !== 'daily' && (
            <div className="space-y-3">
              <Label>
                Times per {freqType === 'weekly' ? 'week' : 'month'}:{' '}
                <span className="font-bold">{freqValue}</span>
              </Label>
              <Slider
                min={1}
                max={maxFreq}
                step={1}
                value={[freqValue]}
                onValueChange={([v]) => setFreqValue(v)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-semibold border transition-all',
                    selectedTags.has(tag)
                      ? 'ring-2 ring-primary ring-offset-1 ring-offset-background border-transparent'
                      : 'border-transparent'
                  )}
                  style={getTagStyle(tag)}
                >
                  {formatTag(tag)}
                </button>
              ))}

              {showNewTagInput ? (
                <div className="flex items-center gap-1">
                  <Input
                    autoFocus
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addNewTag() }
                      if (e.key === 'Escape') { setShowNewTagInput(false); setNewTagInput('') }
                    }}
                    placeholder="tag name"
                    className="h-7 w-24 text-sm px-2"
                  />
                  <button
                    type="button"
                    onClick={addNewTag}
                    className="text-xs text-primary font-medium"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewTagInput(true)}
                  className="px-3 py-1 rounded-full text-sm border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  + Add tag
                </button>
              )}
            </div>
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
