import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export function AdminLogin() {
  const { profile, signIn } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (profile) return <Navigate to="/admin" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await signIn(email, password)
      navigate('/admin')
    } catch (error) {
      push(error instanceof Error ? error.message : 'Unable to sign in.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
      <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Admin</p>
      <h1 className="mt-1 font-serif text-4xl">Sign in</h1>
      <p className="mt-2 text-sm text-muted">
        Use the exact email and password from Supabase Authentication. Example addresses like ahmad@your-domain.edu will not work unless you created that user.
      </p>
      <form onSubmit={(event) => void submit(event)} className="glass mt-6 space-y-4 rounded-2xl p-5">
        <Field label="Email">
          <Input
            type="email"
            autoComplete="username"
            placeholder="the email you created in Supabase"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <Link to="/" className="mt-6 text-sm text-muted">
        Back to class access
      </Link>
    </div>
  )
}
