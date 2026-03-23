import type { FailedPeriod } from '@/lib/habitUtils'
import { formatISOWeekLabel } from '@/lib/dateUtils'

interface FailureLogProps {
  failures: FailedPeriod[]
  freqType: 'daily' | 'weekly' | 'monthly'
  freqValue: number
}

function formatPeriodLabel(period: string, freqType: 'daily' | 'weekly' | 'monthly'): string {
  if (freqType === 'daily') {
    const d = new Date(period + 'T00:00:00')
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }
  if (freqType === 'weekly') return formatISOWeekLabel(period)
  const [year, month] = period.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function FailureLog({ failures, freqType, freqValue }: FailureLogProps) {
  if (failures.length === 0) {
    return <p className="text-sm text-muted-foreground">No missed periods. Keep it up!</p>
  }

  const showCount = freqValue > 1

  return (
    <div className="space-y-0">
      {failures.slice(0, 20).map(f => (
        <div key={f.period} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
          <span className="text-sm">{formatPeriodLabel(f.period, freqType)}</span>
          {showCount && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {f.completed}/{f.required}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
