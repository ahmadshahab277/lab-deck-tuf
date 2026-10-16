import { Download, RefreshCw, Smartphone } from 'lucide-react'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { INSTALL_COPY } from '../../lib/pwa'
import { Button } from '../ui/Button'

export function InstallCard({ title, compact = false }: { title: string; compact?: boolean }) {
  const { promptEvent, installed, updateReady, platform, install, applyUpdate } = usePwaInstall()
  const steps = INSTALL_COPY[platform]

  return (
    <section className={`rounded-2xl border border-line bg-white ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-pine-soft text-pine">
          <Smartphone size={18} />
        </span>
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted">
            Install the same LabDesk app on this device. After installation it opens the last place you used — admin or class.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {installed ? (
          <p className="text-sm text-pine">This device is already using the installed app.</p>
        ) : promptEvent ? (
          <Button onClick={() => void install()}>
            <Download size={16} />
            Install app
          </Button>
        ) : (
          <div className="rounded-xl bg-canvas px-4 py-3 text-sm">
            <p className="font-medium">Add it manually on this device</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {updateReady ? (
          <Button variant="secondary" onClick={() => void applyUpdate()}>
            <RefreshCw size={16} />
            Update available
          </Button>
        ) : null}
      </div>
    </section>
  )
}
