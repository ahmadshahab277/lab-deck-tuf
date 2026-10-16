import { useEffect, useRef, useState } from 'react'
import { Check, Download, RefreshCw } from 'lucide-react'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { INSTALL_COPY } from '../../lib/pwa'

export function InstallButton() {
  const { promptEvent, installed, updateReady, platform, install, applyUpdate } = usePwaInstall()
  const [help, setHelp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const steps = INSTALL_COPY[platform]

  useEffect(() => {
    if (!help) return
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setHelp(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setHelp(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [help])

  if (updateReady) {
    return (
      <button type="button" onClick={() => void applyUpdate()} className={barButton}>
        <RefreshCw size={14} />
        Update app
      </button>
    )
  }

  if (installed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
        <Check size={14} />
        App installed
      </span>
    )
  }

  if (promptEvent) {
    return (
      <button type="button" onClick={() => void install()} className={barButton}>
        <Download size={14} />
        Install app
      </button>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={barButton}
        aria-expanded={help}
        aria-haspopup="dialog"
        onClick={() => setHelp((open) => !open)}
      >
        <Download size={14} />
        Install app
      </button>
      {help ? (
        <div role="dialog" aria-label="Install LabDesk" className="absolute top-[calc(100%+8px)] right-0 z-50 w-72 border border-white/10 bg-[#1c1917] p-4 text-left text-white shadow-2xl">
          <p className="text-sm font-medium">Add LabDesk to this device</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm text-white/70">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  )
}

const barButton = 'inline-flex items-center gap-1.5 bg-pine px-3 py-1.5 text-sm font-medium text-white hover:bg-[#c2410c]'
