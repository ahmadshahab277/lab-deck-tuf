import type { LucideIcon } from 'lucide-react'

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string | number
  hint: string
  icon?: LucideIcon
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{label}</p>
        {Icon ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-pine-soft text-pine">
            <Icon size={15} />
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-serif text-[2rem] leading-none tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>
    </div>
  )
}

export function Meter({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  const pct = total <= 0 ? 0 : Math.min(100, Math.round((value / total) * 100))
  const measured = total > 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-mono text-xs text-muted tabular-nums">
          {value}/{total}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[#f3f3f3]"
        role={measured ? 'meter' : undefined}
        aria-label={label}
        aria-valuemin={measured ? 0 : undefined}
        aria-valuemax={measured ? total : undefined}
        aria-valuenow={measured ? value : undefined}
      >
        <div className="h-full rounded-full bg-pine" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
