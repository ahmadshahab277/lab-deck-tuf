import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { createClass, uploadResource } from '../../lib/admin'
import { buildClassSlug } from '../../lib/slug'

export function ClassForm() {
  const { profile } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [semester, setSemester] = useState('Fall')
  const [section, setSection] = useState('A')
  const [year, setYear] = useState('2026')
  const [timezone, setTimezone] = useState('Asia/Karachi')
  const [outline, setOutline] = useState('')
  const [outlinePdf, setOutlinePdf] = useState<File | null>(null)
  const [guidelines, setGuidelines] = useState('')
  const [password, setPassword] = useState('')
  const [publishNow, setPublishNow] = useState(true)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!profile || busy) return
    if (password.length < 8) {
      push('Class password must be at least 8 characters.', 'error')
      return
    }
    setBusy(true)
    try {
      const created = await createClass(
        {
          slug: buildClassSlug({ course_code: courseCode, section, academic_year: year }),
          title,
          course_code: courseCode,
          semester,
          section,
          academic_year: year,
          timezone,
          outline,
          submission_guidelines: guidelines,
          status: publishNow ? 'published' : 'draft',
          password,
        },
        profile.id,
      )
      if (outlinePdf) {
        await uploadResource({
          classId: created.id,
          title: 'Course outline',
          description: 'Uploaded course outline PDF',
          resource_type: 'outline',
          topic: '',
          week_number: null,
          lecture_number: null,
          related_lab_id: null,
          status: 'published',
          file: outlinePdf,
          createdBy: profile.id,
        })
      }
      push(publishNow ? 'Class created and opened for students.' : 'Class created as a draft. Publish it before students can enter.')
      navigate(`/admin/classes/${created.id}`)
    } catch (error) {
      push(error instanceof Error ? error.message : 'Unable to create class.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-serif text-4xl">New class</h1>
      <Field label="Course title">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course code">
          <Input value={courseCode} onChange={(event) => setCourseCode(event.target.value)} required />
        </Field>
        <Field label="Section">
          <Input value={section} onChange={(event) => setSection(event.target.value)} required />
        </Field>
        <Field label="Semester">
          <Input value={semester} onChange={(event) => setSemester(event.target.value)} required />
        </Field>
        <Field label="Academic year">
          <Input value={year} onChange={(event) => setYear(event.target.value)} required />
        </Field>
      </div>
      <Field label="Class timezone" hint="Deadlines are shown in this timezone.">
        <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
          <option value="Asia/Karachi">Asia/Karachi</option>
          <option value="Asia/Dubai">Asia/Dubai</option>
          <option value="Europe/London">Europe/London</option>
          <option value="America/New_York">America/New_York</option>
        </Select>
      </Field>
      <Field label="Course outline (text)" hint="You can use text, a PDF, or both.">
        <Textarea value={outline} onChange={(event) => setOutline(event.target.value)} />
      </Field>
      <Field label="Course outline (PDF)">
        <Input type="file" accept="application/pdf,.pdf" onChange={(event) => setOutlinePdf(event.target.files?.[0] ?? null)} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={publishNow} onChange={(event) => setPublishNow(event.target.checked)} />
        Open this class to students now (required for the class password to work)
      </label>
      <Field label="Class submission guidelines">
        <Textarea value={guidelines} onChange={(event) => setGuidelines(event.target.value)} />
      </Field>
      <Field label="Shared class password" hint="Students use this password. It is stored as a hash and never shown again.">
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
      </Field>
      <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create class'}</Button>
    </form>
  )
}
