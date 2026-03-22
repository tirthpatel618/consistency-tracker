import type { FailedPeriod } from '@/lib/habitUtils'

interface FailureLogProps {
  failures: FailedPeriod[]
  freqType: 'daily' | 'weekly' | 'monthly'
}

function formatPeriod(period: string, freqType: 'daily' | 'weekly' | 'monthly'): string {
  if (freqType === 'daily') {
    const d = new Date(period + 'T00:00:00')
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (freqType === 'weekly') return `Week of ${period}`
  const [year, month] = period.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function FailureLog({ failures, freqType }: FailureLogProps) {
  if (failures.length === 0) {
    return <p className="text-sm text-muted-foreground">No missed periods. Keep it up!</p>
  }

  return (
    <div className="space-y-2">
      {failures.slice(0, 20).map(f => (
        <div key={f.period} className="flex items-center justify-between py-2 border-b border-border last:border-0">
          <span className="text-sm">{formatPeriod(f.period, freqType)}</span>
          <span className="text-sm text-muted-foreground font-mono">
            {f.completed}/{f.required}
          </span>
        </div>
      ))}
    </div>
  )
}
