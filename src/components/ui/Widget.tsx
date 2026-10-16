import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function Widget({
  icon: Icon,
  label,
  children,
  action,
  id,
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
  action?: ReactNode
  id?: string
}) {
  return (
    <section id={id} className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-pine-soft text-pine">
            <Icon size={15} />
          </span>
          <h2 className="text-[13px] font-semibold">{label}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
