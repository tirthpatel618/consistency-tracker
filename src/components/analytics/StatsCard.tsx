interface StatsCardProps {
  label: string
  value: string | number
  subtitle?: string
}

export function StatsCard({ label, value, subtitle }: StatsCardProps) {
  return (
    <div className="flex-1 bg-card border border-border rounded-xl p-4 space-y-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
