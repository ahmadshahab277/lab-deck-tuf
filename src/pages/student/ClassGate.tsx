import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, Outlet, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/EmptyState'
import { useClassSession } from '../../context/ClassSessionContext'
import { persistClassSession, storedClassSession, verifyClassPassword } from '../../lib/classAccess'

export function ClassGate() {
  const { slug } = useParams()
  const { ready, data, token, reload } = useClassSession()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void reload()
  }, [slug])

  if (!ready) return <Spinner label="Checking class access" />
  if (!slug) return <Navigate to="/" replace />

  const session = storedClassSession()
  if (token && data && session?.slug === slug) {
    return <Outlet />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!slug || busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await verifyClassPassword(slug, password)
      if (!result.ok) {
        setError(result.error)
        return
      }
      persistClassSession(slug, result.token, result.expires_at)
      setPassword('')
      await reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
      <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Student access</p>
      <h1 className="mt-1 font-serif text-4xl">Enter class password</h1>
      <p className="mt-2 text-sm text-muted">
        No student accounts and no registration. Open the class link, enter the one shared class password, then read and download the materials.
      </p>
      <form onSubmit={(event) => void submit(event)} className="glass mt-6 space-y-4 rounded-2xl p-5">
        <Field label="Class password">
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Checking…' : 'Open class'}</Button>
      </form>
      <Link to="/" className="mt-6 text-sm text-muted">Use a different class</Link>
    </div>
  )
}
