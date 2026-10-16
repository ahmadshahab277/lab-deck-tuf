import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { normalizeSlugInput } from '../lib/slug'

export function Landing() {
  const navigate = useNavigate()
  const [slug, setSlug] = useState('')

  function openClass(event: FormEvent) {
    event.preventDefault()
    const next = normalizeSlugInput(slug)
    if (next) navigate(`/c/${next}`)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-5 py-10">
      <p className="text-[11px] tracking-[0.22em] text-muted uppercase">The University of Faisalabad</p>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">LabDesk</h1>
      <p className="mt-3 max-w-lg text-muted">
        Students only need a class link and one shared password. No registration, no student accounts, and no online submissions.
      </p>
      <form onSubmit={openClass} className="glass mt-8 rounded-2xl p-5">
        <label className="text-sm font-medium">Open a class</label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="Class code or pasted class link"
          />
          <Button type="submit">
            Continue
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
      <p className="mt-6 text-sm text-muted">
        Instructors:{' '}
        <Link to="/admin/login" className="text-pine underline-offset-4 hover:underline">
          Admin sign in
        </Link>
      </p>
    </div>
  )
}
