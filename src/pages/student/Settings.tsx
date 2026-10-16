import { InstallCard } from '../../components/pwa/InstallCard'
import { Button } from '../../components/ui/Button'
import { useClassSession } from '../../context/ClassSessionContext'
import { revokeLocalClassSession } from '../../lib/classAccess'

export function StudentSettings() {
  const { reload } = useClassSession()

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-4xl">Settings</h1>
      <InstallCard title="Install App" />
      <section className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">
        Offline reading only applies to the app shell. Class files you download are copies on this device. A later password change
        cannot erase those copies.
      </section>
      <Button
        variant="secondary"
        onClick={() => {
          void revokeLocalClassSession().then(reload)
        }}
      >
        Leave class
      </Button>
    </div>
  )
}
