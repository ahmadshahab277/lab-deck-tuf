import { useAuth } from '../../context/AuthContext'
import { TimetableSettings } from './TimetableSettings'

export function AdminSettings() {
  const { profile } = useAuth()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-4xl">Settings</h1>
        <p className="text-sm text-muted">Signed in as {profile?.full_name}.</p>
      </div>
      <TimetableSettings />
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">Account</h2>
        <p className="mt-2 text-sm text-muted">{profile?.email}</p>
        <p className="mt-2 text-sm text-muted">
          Admin access is granted only to allowlisted instructor accounts. Students cannot reach this area with a class password.
        </p>
      </section>
      <section className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">
        Downloaded class files stay on a student’s device. Changing a class password revokes live access, but it cannot erase files already saved locally.
      </section>
    </div>
  )
}
