import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
      <button type="button" className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className={`glass relative max-h-[92dvh] w-full overflow-auto rounded-2xl p-5 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-serif text-2xl">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-white">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
