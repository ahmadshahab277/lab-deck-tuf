import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState, Spinner } from '../../components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  addTaughtTopic,
  deleteAnnouncement,
  deleteAssignment,
  deleteLab,
  deleteResource,
  deleteTaughtTopic,
  getClass,
  getProgress,
  listAnnouncements,
  listAssignments,
  listGuidelines,
  listLabs,
  listResources,
  listTaughtTopics,
  revokeClassAccess,
  revokeClassSessions,
  publishAnnouncement,
  saveAnnouncement,
  saveAssignment,
  saveGuideline,
  saveLab,
  saveProgress,
  setClassPassword,
  updateClass,
  updateResource,
  uploadResource,
} from '../../lib/admin'
import { assignmentDisplayStatus } from '../../lib/deadlines'
import { formatDate, formatDateTime, padLab, resourceTypeLabel } from '../../lib/format'
import { structuredLabTemplate } from '../../lib/labTemplate'
import { downloadStoredFile, openResourceDownload } from '../../lib/student'
import { classUrl } from '../../lib/slug'
import { makeQrDataUrl } from '../../lib/qr'
import { SOP_TEMPLATES } from '../../lib/sopTemplates'
import type {
  Announcement,
  ClassGuideline,
  ClassProgress,
  CourseClass,
  LabTask,
  PublicationStatus,
  Resource,
  ResourceType,
  TaskAssignment,
  TaughtTopic,
} from '../../types'

const tabs = [
  'Overview',
  'Outline',
  'Resources',
  'Labs',
  'Tasks',
  'Announcements',
  'Guidelines',
  'Notes',
  'Access',
] as const

export function ClassWorkspace() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { push } = useToast()
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview')
  const [course, setCourse] = useState<CourseClass | null>(null)
  const [resources, setResources] = useState<Resource[]>([])
  const [labs, setLabs] = useState<LabTask[]>([])
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [guidelines, setGuidelines] = useState<ClassGuideline[]>([])
  const [progress, setProgress] = useState<ClassProgress | null>(null)
  const [topics, setTopics] = useState<TaughtTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (!id) return
    const [nextCourse, nextResources, nextLabs, nextAssignments, nextAnnouncements, nextGuidelines, nextProgress, nextTopics] =
      await Promise.all([
        getClass(id),
        listResources(id),
        listLabs(id),
        listAssignments(id),
        listAnnouncements(id),
        listGuidelines(id),
        getProgress(id),
        listTaughtTopics(id),
      ])
    setCourse(nextCourse)
    setResources(nextResources)
    setLabs(nextLabs)
    setAssignments(nextAssignments)
    setAnnouncements(nextAnnouncements)
    setGuidelines(nextGuidelines)
    setProgress(nextProgress)
    setTopics(nextTopics)
  }

  useEffect(() => {
    refresh()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load class.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spinner label="Loading class" />
  if (error || !course || !profile) return <EmptyState title="Class unavailable" body={error ?? 'Not found.'} />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{course.course_code} · {course.section} · {course.academic_year}</p>
          <h1 className="font-serif text-4xl">{course.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge value={course.status} />
          {course.status !== 'published' ? (
            <Button
              onClick={() =>
                void updateClass(course.id, { status: 'published' })
                  .then(refresh)
                  .then(() => push('Class published. Students can now enter with the class password.'))
              }
            >
              Publish for students
            </Button>
          ) : null}
        </div>
      </div>
      {course.status !== 'published' ? (
        <p className="rounded-xl bg-[#f6e6e2] px-4 py-3 text-sm text-danger">
          This class is a {course.status}. Students will see “Unable to verify class access” until you publish it.
        </p>
      ) : null}
      <div className="flex gap-1 overflow-auto">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${tab === item ? 'bg-pine text-white' : 'bg-white text-muted'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Overview' ? (
        <Overview
          course={course}
          resources={resources}
          labs={labs}
          assignments={assignments}
          progress={progress}
          topics={topics}
          userId={profile.id}
          onChange={refresh}
        />
      ) : null}
      {tab === 'Outline' ? (
        <OutlineTab
          course={course}
          resources={resources}
          userId={profile.id}
          onSave={async (patch) => { await updateClass(course.id, patch); await refresh(); push('Saved.') }}
          onChange={refresh}
        />
      ) : null}
      {tab === 'Resources' ? (
        <ResourcesTab
          course={course}
          resources={resources}
          labs={labs}
          userId={profile.id}
          onChange={refresh}
        />
      ) : null}
      {tab === 'Labs' ? <LabsTab course={course} labs={labs} resources={resources} userId={profile.id} onChange={refresh} /> : null}
      {tab === 'Tasks' ? <TasksTab course={course} labs={labs} resources={resources} assignments={assignments} userId={profile.id} onChange={refresh} /> : null}
      {tab === 'Announcements' ? <AnnouncementsTab course={course} items={announcements} userId={profile.id} onChange={refresh} /> : null}
      {tab === 'Guidelines' ? <GuidelinesTab items={guidelines} onChange={refresh} /> : null}
      {tab === 'Notes' ? (
        <ProgressTab
          course={course}
          progress={progress}
          topics={topics}
          labs={labs}
          userId={profile.id}
          onChange={refresh}
        />
      ) : null}
      {tab === 'Access' ? <AccessTab course={course} onChange={refresh} /> : null}
    </div>
  )
}

function Overview({
  course,
  resources,
  labs,
  assignments,
  progress,
  topics,
  userId,
  onChange,
}: {
  course: CourseClass
  resources: Resource[]
  labs: LabTask[]
  assignments: TaskAssignment[]
  progress: ClassProgress | null
  topics: TaughtTopic[]
  userId: string
  onChange: () => Promise<void>
}) {
  const { push } = useToast()
  const latestTopic = topics[0]
  const namedTasks = assignments.filter((item) => item.assignee_type !== 'class' && item.assignee_name)
  const [notes, setNotes] = useState(progress?.notes ?? '')
  const [lastTopic, setLastTopic] = useState(progress?.last_topic ?? '')
  const [lastWeek, setLastWeek] = useState(progress?.last_week?.toString() ?? '')
  const [lastLecture, setLastLecture] = useState(progress?.last_lecture_number?.toString() ?? '')
  const [lastLab, setLastLab] = useState(progress?.last_lab_number?.toString() ?? '')

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <form
        className="space-y-3 rounded-2xl border border-line bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault()
          void saveProgress({
            class_id: course.id,
            last_week: lastWeek ? Number(lastWeek) : null,
            last_lecture_number: lastLecture ? Number(lastLecture) : null,
            last_lab_number: lastLab ? Number(lastLab) : null,
            last_topic: lastTopic,
            notes,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          }).then(onChange).then(() => push('Class notes saved.'))
        }}
      >
        <p className="text-sm text-muted">Class notes / reminder</p>
        <p className="font-serif text-2xl">{lastTopic || latestTopic?.title || 'What did we cover last time?'}</p>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Week"><Input type="number" value={lastWeek} onChange={(event) => setLastWeek(event.target.value)} /></Field>
          <Field label="Lecture"><Input type="number" value={lastLecture} onChange={(event) => setLastLecture(event.target.value)} /></Field>
          <Field label="Lab"><Input type="number" value={lastLab} onChange={(event) => setLastLab(event.target.value)} /></Field>
        </div>
        <Field label="Last topic taught">
          <Input value={lastTopic} onChange={(event) => setLastTopic(event.target.value)} placeholder="e.g. Pointers and arrays" />
        </Field>
        <Field label="Private reminder notes" hint="Only instructors see this. Students never see these notes.">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What you taught, who you asked to prepare, what to repeat next class..." />
        </Field>
        <Button type="submit">Save reminder</Button>
      </form>
      <div className="space-y-3">
        <div className="rounded-2xl border border-line bg-white p-4 text-sm">
          <p>{resources.filter((item) => item.is_current).length} resources · {labs.length} labs · {assignments.length} tasks</p>
          <p className="mt-2 text-muted">Timezone {course.timezone}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-sm text-muted">Named task assignments</p>
          {namedTasks.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No individual or group names assigned yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {namedTasks.slice(0, 8).map((item) => (
                <li key={item.id} className="text-sm">
                  <span className="font-medium">{item.assignee_name}</span>
                  <span className="text-muted"> · {item.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {topics[0] ? (
          <div className="rounded-2xl border border-line bg-white p-4 text-sm">
            <p className="text-muted">Latest teaching log</p>
            <p className="mt-1 font-medium">{topics[0].title}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function OutlineTab({
  course,
  resources,
  userId,
  onSave,
  onChange,
}: {
  course: CourseClass
  resources: Resource[]
  userId: string
  onSave: (patch: Partial<CourseClass>) => Promise<void>
  onChange: () => Promise<void>
}) {
  const { push } = useToast()
  const [title, setTitle] = useState(course.title)
  const [outline, setOutline] = useState(course.outline)
  const [guidelines, setGuidelines] = useState(course.submission_guidelines)
  const [status, setStatus] = useState(course.status)
  const [busy, setBusy] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const outlines = resources.filter((item) => item.resource_type === 'outline' && item.is_current)

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          setBusy(true)
          void onSave({ title, outline, submission_guidelines: guidelines, status }).finally(() => setBusy(false))
        }}
      >
        <Field label="Title"><Input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as CourseClass['status'])}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </Select>
        </Field>
        <Field label="Course outline (text)" hint="Students can read this on the Course Outline page.">
          <Textarea value={outline} onChange={(event) => setOutline(event.target.value)} className="min-h-48" />
        </Field>
        <Field label="Class submission guidelines"><Textarea value={guidelines} onChange={(event) => setGuidelines(event.target.value)} /></Field>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save text outline'}</Button>
      </form>

      <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
        <h2 className="font-serif text-2xl">Course outline PDF</h2>
        <p className="text-sm text-muted">Upload a PDF as well as, or instead of, the text outline. Students can preview and download it.</p>
        <Field label="Upload PDF">
          <Input
            type="file"
            accept="application/pdf,.pdf"
            disabled={pdfBusy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              setPdfBusy(true)
              void uploadResource({
                classId: course.id,
                title: 'Course outline',
                description: 'Course outline PDF',
                resource_type: 'outline',
                topic: '',
                week_number: null,
                lecture_number: null,
                related_lab_id: null,
                status: 'published',
                file,
                createdBy: userId,
                replacesId: outlines[0]?.id ?? null,
              })
                .then(onChange)
                .then(() => push('Outline PDF saved.'))
                .catch((error: unknown) => push(error instanceof Error ? error.message : 'Upload failed.', 'error'))
                .finally(() => setPdfBusy(false))
            }}
          />
        </Field>
        {outlines.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2 text-sm">
            <span>{item.file_name} · v{item.version}{item.is_current ? ' · current' : ''}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => void openResourceDownload(item.id).catch((error: unknown) => push(error instanceof Error ? error.message : 'Download failed.', 'error'))}>Download</Button>
              <Button variant="ghost" onClick={() => void deleteResource(item).then(onChange)}>Remove</Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

function ResourcesTab({
  course,
  resources,
  labs,
  userId,
  onChange,
}: {
  course: CourseClass
  resources: Resource[]
  labs: LabTask[]
  userId: string
  onChange: () => Promise<void>
}) {
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [replacing, setReplacing] = useState<Resource | null>(null)
  const current = resources.filter((item) => item.is_current)

  return (
    <div className="space-y-3">
      <Button onClick={() => { setReplacing(null); setOpen(true) }}>Upload resource</Button>
      {current.length === 0 ? <EmptyState title="No resources" body="Upload a PDF, slides, or source file." /> : null}
      {current.map((item) => (
        <article key={item.id} className="rounded-2xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted">
                {resourceTypeLabel(item.resource_type)} · {item.file_name} · v{item.version}
                {item.is_current ? ' · current' : ''}
              </p>
            </div>
            <Badge value={item.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void openResourceDownload(item.id).catch((error: unknown) => push(error instanceof Error ? error.message : 'Download failed.', 'error'))}>
              <Download size={14} /> Download
            </Button>
            <Button variant="secondary" onClick={() => void updateResource(item.id, { status: item.status === 'published' ? 'draft' : 'published' }).then(onChange)}>
              {item.status === 'published' ? 'Unpublish' : 'Publish'}
            </Button>
            <Button variant="secondary" onClick={() => { setReplacing(item); setOpen(true) }}>Replace file</Button>
            <Button variant="ghost" onClick={() => void deleteResource(item).then(onChange).then(() => push('Resource removed.'))}>Delete</Button>
          </div>
        </article>
      ))}
      {open ? (
        <ResourceModal
          course={course}
          labs={labs}
          userId={userId}
          replacing={replacing}
          onClose={() => setOpen(false)}
          onSaved={async () => { setOpen(false); await onChange(); push('Resource saved.') }}
        />
      ) : null}
    </div>
  )
}

function ResourceModal({
  course,
  labs,
  userId,
  replacing,
  onClose,
  onSaved,
}: {
  course: CourseClass
  labs: LabTask[]
  userId: string
  replacing: Resource | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { push } = useToast()
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState(replacing?.title ?? '')
  const [description, setDescription] = useState(replacing?.description ?? '')
  const [type, setType] = useState<ResourceType>(replacing?.resource_type ?? 'lecture')
  const [topic, setTopic] = useState(replacing?.topic ?? '')
  const [week, setWeek] = useState(replacing?.week_number?.toString() ?? '')
  const [lecture, setLecture] = useState(replacing?.lecture_number?.toString() ?? '')
  const [labId, setLabId] = useState(replacing?.related_lab_id ?? '')
  const [status, setStatus] = useState<PublicationStatus>(replacing?.status ?? 'published')
  const [file, setFile] = useState<File | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file || busy) return
    setBusy(true)
    try {
      await uploadResource({
        classId: course.id,
        title,
        description,
        resource_type: type,
        topic,
        week_number: week ? Number(week) : null,
        lecture_number: lecture ? Number(lecture) : null,
        related_lab_id: labId || null,
        status,
        file,
        createdBy: userId,
        replacesId: replacing?.id ?? null,
      })
      await onSaved()
    } catch (error) {
      push(error instanceof Error ? error.message : 'Upload failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={replacing ? 'Replace resource' : 'Upload resource'} onClose={onClose}>
      <form className="space-y-3" onSubmit={(event) => void submit(event)}>
        <Field label="Title"><Input value={title} onChange={(event) => setTitle(event.target.value)} required /></Field>
        <Field label="Description"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
        <Field label="Type">
          <Select value={type} onChange={(event) => setType(event.target.value as ResourceType)}>
            <option value="outline">outline</option>
            <option value="lecture">lecture</option>
            <option value="lab_manual">lab manual</option>
            <option value="slides">slides</option>
            <option value="code">code</option>
            <option value="handout">handout</option>
            <option value="other">other</option>
          </Select>
        </Field>
        <Field label="Topic"><Input value={topic} onChange={(event) => setTopic(event.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Week"><Input type="number" value={week} onChange={(event) => setWeek(event.target.value)} /></Field>
          <Field label="Lecture"><Input type="number" value={lecture} onChange={(event) => setLecture(event.target.value)} /></Field>
        </div>
        <Field label="Related lab">
          <Select value={labId} onChange={(event) => setLabId(event.target.value)}>
            <option value="">None</option>
            {labs.map((lab) => <option key={lab.id} value={lab.id}>Lab {padLab(lab.lab_number)}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as PublicationStatus)}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </Select>
        </Field>
        <Field label="File">
          <Input type="file" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </Field>
        <Button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Save resource'}</Button>
      </form>
    </Modal>
  )
}

function LabsTab({
  course,
  labs,
  resources,
  userId,
  onChange,
}: {
  course: CourseClass
  labs: LabTask[]
  resources: Resource[]
  userId: string
  onChange: () => Promise<void>
}) {
  const { push } = useToast()
  const [editing, setEditing] = useState<Partial<LabTask> | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button onClick={() => setEditing(structuredLabTemplate(labs.length + 1))}>New from template</Button>
        <Button variant="secondary" onClick={() => setEditing({ lab_number: labs.length + 1, title: '', status: 'draft' })}>Blank lab</Button>
      </div>
      {labs.map((lab) => (
        <article key={lab.id} className="rounded-2xl border border-line bg-white p-4">
          <div className="flex justify-between gap-3">
            <div>
              <p className="font-medium">Lab {padLab(lab.lab_number)} · {lab.title}</p>
              <p className="text-xs text-muted">{lab.deadline ? formatDateTime(lab.deadline, course.timezone) : 'No deadline'}</p>
            </div>
            <Badge value={lab.status} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(lab)}>Edit</Button>
            <Button variant="ghost" onClick={() => void deleteLab(lab.id).then(onChange)}>Delete</Button>
          </div>
        </article>
      ))}
      {editing ? (
        <LabModal
          course={course}
          lab={editing}
          resources={resources}
          userId={userId}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await onChange(); push('Lab saved.') }}
        />
      ) : null}
    </div>
  )
}

function LabModal({
  course,
  lab,
  resources,
  userId,
  onClose,
  onSaved,
}: {
  course: CourseClass
  lab: Partial<LabTask>
  resources: Resource[]
  userId: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { push } = useToast()
  const [draft, setDraft] = useState(lab)
  const [busy, setBusy] = useState(false)
  const manuals = resources.filter((item) => item.resource_type === 'lab_manual')

  function set<K extends keyof LabTask>(key: K, value: LabTask[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <Modal title={draft.id ? 'Edit lab' : 'Create lab'} onClose={onClose} wide>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (busy) return
          setBusy(true)
          void saveLab({
            ...draft,
            class_id: course.id,
            created_by: userId,
            title: draft.title ?? '',
            lab_number: Number(draft.lab_number ?? 1),
            status: draft.status ?? 'draft',
          })
            .then(onSaved)
            .catch((error: unknown) => push(error instanceof Error ? error.message : 'Unable to save lab.', 'error'))
            .finally(() => setBusy(false))
        }}
      >
        <Field label="Lab number"><Input type="number" value={draft.lab_number ?? 1} onChange={(event) => set('lab_number', Number(event.target.value))} /></Field>
        <Field label="Title"><Input value={draft.title ?? ''} onChange={(event) => set('title', event.target.value)} required /></Field>
        <Field label="Deadline"><Input type="datetime-local" value={toLocal(draft.deadline)} onChange={(event) => set('deadline', fromLocal(event.target.value))} /></Field>
        <Field label="Status">
          <Select value={draft.status ?? 'draft'} onChange={(event) => set('status', event.target.value as PublicationStatus)}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </Select>
        </Field>
        <Field label="Attached manual PDF">
          <Select value={draft.manual_resource_id ?? ''} onChange={(event) => set('manual_resource_id', event.target.value || null)}>
            <option value="">Structured task only</option>
            {manuals.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </Select>
        </Field>
        <div className="md:col-span-2"><Field label="Objectives"><Textarea value={draft.objectives ?? ''} onChange={(event) => set('objectives', event.target.value)} /></Field></div>
        <div className="md:col-span-2"><Field label="Instructions"><Textarea value={draft.instructions ?? ''} onChange={(event) => set('instructions', event.target.value)} /></Field></div>
        <div className="md:col-span-2"><Field label="Exercises"><Textarea value={draft.exercises ?? ''} onChange={(event) => set('exercises', event.target.value)} /></Field></div>
        <Field label="Required concepts"><Textarea value={draft.required_concepts ?? ''} onChange={(event) => set('required_concepts', event.target.value)} /></Field>
        <Field label="Assessment criteria"><Textarea value={draft.assessment_criteria ?? ''} onChange={(event) => set('assessment_criteria', event.target.value)} /></Field>
        <Field label="Sample input"><Textarea value={draft.sample_input ?? ''} onChange={(event) => set('sample_input', event.target.value)} /></Field>
        <Field label="Sample output"><Textarea value={draft.sample_output ?? ''} onChange={(event) => set('sample_output', event.target.value)} /></Field>
        <Field label="Printing requirements"><Textarea value={draft.printing_requirements ?? ''} onChange={(event) => set('printing_requirements', event.target.value)} /></Field>
        <Field label="Submission guidelines"><Textarea value={draft.submission_guidelines ?? ''} onChange={(event) => set('submission_guidelines', event.target.value)} /></Field>
        <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save lab'}</Button></div>
      </form>
    </Modal>
  )
}

function TasksTab({
  course,
  labs,
  resources,
  assignments,
  userId,
  onChange,
}: {
  course: CourseClass
  labs: LabTask[]
  resources: Resource[]
  assignments: TaskAssignment[]
  userId: string
  onChange: () => Promise<void>
}) {
  const [editing, setEditing] = useState<Partial<TaskAssignment> | null>(null)
  return (
    <div className="space-y-3">
      <Button onClick={() => setEditing({ assignee_type: 'individual', status: 'upcoming', priority: 'normal', is_published: true, assignee_name: '' })}>
        Assign task
      </Button>
      {assignments.map((item) => (
        <article key={item.id} className="rounded-2xl border border-line bg-white p-4">
          <div className="flex justify-between gap-3">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted">
                {item.assignee_type === 'class' ? 'Entire class' : `${item.assignee_type}: ${item.assignee_name} (name entered by instructor)`}
              </p>
            </div>
            <Badge value={assignmentDisplayStatus(item)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditing(item)}>Edit</Button>
            {item.status !== 'completed' ? (
              <Button variant="secondary" onClick={() => void saveAssignment({ ...item, status: 'completed', completed_at: new Date().toISOString(), completed_by: userId, created_by: userId }).then(onChange)}>
                Mark complete
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => void deleteAssignment(item.id).then(onChange)}>Delete</Button>
          </div>
        </article>
      ))}
      {editing ? (
        <TaskModal course={course} labs={labs} resources={resources} item={editing} userId={userId} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onChange() }} />
      ) : null}
    </div>
  )
}

function TaskModal({
  course,
  labs,
  resources,
  item,
  userId,
  onClose,
  onSaved,
}: {
  course: CourseClass
  labs: LabTask[]
  resources: Resource[]
  item: Partial<TaskAssignment>
  userId: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { push } = useToast()
  const [draft, setDraft] = useState(item)
  const [busy, setBusy] = useState(false)
  return (
    <Modal title="Task assignment" onClose={onClose} wide>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (busy) return
          setBusy(true)
          void saveAssignment({
            ...draft,
            class_id: course.id,
            created_by: userId,
            title: draft.title ?? '',
            assignee_type: draft.assignee_type ?? 'class',
            assignee_name: draft.assignee_name ?? '',
            status: draft.status ?? 'upcoming',
            priority: draft.priority ?? 'normal',
            is_published: draft.is_published ?? false,
          })
            .then(onSaved)
            .catch((error: unknown) => push(error instanceof Error ? error.message : 'Unable to save task.', 'error'))
            .finally(() => setBusy(false))
        }}
      >
        <div className="md:col-span-2"><Field label="Title"><Input value={draft.title ?? ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></Field></div>
        <Field label="Assigned to">
          <Select value={draft.assignee_type} onChange={(event) => setDraft({ ...draft, assignee_type: event.target.value as TaskAssignment['assignee_type'] })}>
            <option value="class">Entire class</option>
            <option value="individual">Named individual</option>
            <option value="group">Named group</option>
          </Select>
        </Field>
        <Field label="Display name" hint="Typed by you. The system does not verify identity.">
          <Input value={draft.assignee_name ?? ''} onChange={(event) => setDraft({ ...draft, assignee_name: event.target.value })} disabled={draft.assignee_type === 'class'} />
        </Field>
        <Field label="Deadline"><Input type="datetime-local" value={toLocal(draft.deadline)} onChange={(event) => setDraft({ ...draft, deadline: fromLocal(event.target.value) })} /></Field>
        <Field label="Priority">
          <Select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as TaskAssignment['priority'] })}>
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as TaskAssignment['status'] })}>
            <option value="upcoming">upcoming</option>
            <option value="in_progress">in progress</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </Select>
        </Field>
        <Field label="Visibility">
          <Select value={draft.is_published ? 'published' : 'draft'} onChange={(event) => setDraft({ ...draft, is_published: event.target.value === 'published' })}>
            <option value="draft">draft</option>
            <option value="published">published to class</option>
          </Select>
        </Field>
        <Field label="Related lab">
          <Select value={draft.related_lab_id ?? ''} onChange={(event) => setDraft({ ...draft, related_lab_id: event.target.value || null })}>
            <option value="">None</option>
            {labs.map((lab) => <option key={lab.id} value={lab.id}>Lab {padLab(lab.lab_number)}</option>)}
          </Select>
        </Field>
        <Field label="Related resource">
          <Select value={draft.related_resource_id ?? ''} onChange={(event) => setDraft({ ...draft, related_resource_id: event.target.value || null })}>
            <option value="">None</option>
            {resources.filter((item) => item.is_current).map((res) => <option key={res.id} value={res.id}>{res.title}</option>)}
          </Select>
        </Field>
        <div className="md:col-span-2"><Field label="Description"><Textarea value={draft.description ?? ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field></div>
        <div className="md:col-span-2"><Field label="Instructions"><Textarea value={draft.instructions ?? ''} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} /></Field></div>
        <div className="md:col-span-2"><Field label="Why it matters"><Textarea value={draft.why_it_matters ?? ''} onChange={(event) => setDraft({ ...draft, why_it_matters: event.target.value })} /></Field></div>
        <div className="md:col-span-2"><Field label="Admin notes (never shown to students)"><Textarea value={draft.admin_notes ?? ''} onChange={(event) => setDraft({ ...draft, admin_notes: event.target.value })} /></Field></div>
        <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save assignment'}</Button></div>
      </form>
    </Modal>
  )
}

function AnnouncementsTab({
  course,
  items,
  userId,
  onChange,
}: {
  course: CourseClass
  items: Announcement[]
  userId: string
  onChange: () => Promise<void>
}) {
  const { push } = useToast()
  const [assignee, setAssignee] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [busy, setBusy] = useState(false)
  return (
    <div className="space-y-4">
      <form
        key={formKey}
        className="space-y-3 rounded-2xl border border-line bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (busy) return
          setBusy(true)
          void publishAnnouncement({
            classId: course.id,
            createdBy: userId,
            assigneeName: assignee,
            title,
            description,
            linkUrl: link,
            file,
          })
            .then(async () => {
              setAssignee('')
              setTitle('')
              setDescription('')
              setLink('')
              setFile(null)
              setFormKey((value) => value + 1)
              await onChange()
              push('Announcement published.')
            })
            .catch((error: unknown) => push(error instanceof Error ? error.message : 'Unable to publish the announcement.', 'error'))
            .finally(() => setBusy(false))
        }}
      >
        <Field label="Assign to" hint="Student or group name. Leave blank to address the whole class.">
          <Input value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="e.g. Farhan (2024-BS-SE-094)" />
        </Field>
        <Field label="Title"><Input value={title} onChange={(event) => setTitle(event.target.value)} required /></Field>
        <Field label="Description"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} required /></Field>
        <Field label="Attachment" hint="Optional image, PDF, or other document.">
          <Input
            type="file"
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="Link" hint="Optional. A web link instead of, or as well as, a file.">
          <Input value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://" inputMode="url" />
        </Field>
        <Button type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish announcement'}</Button>
      </form>
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-line bg-white p-4">
          <div className="flex justify-between gap-3">
            <div>
              <p className="text-xs text-muted">{item.assignee_name ? `Assigned to ${item.assignee_name}` : 'Assigned to the whole class'}</p>
              <p className="font-medium">{item.title}</p>
            </div>
            <Badge value={item.status} />
          </div>
          <p className="mt-2 text-sm whitespace-pre-wrap">{item.body}</p>
          {item.link_url ? (
            <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-pine">
              {item.link_url}
            </a>
          ) : null}
          {item.attachment_path ? (
            <div className="mt-2">
              <Button
                variant="secondary"
                onClick={() => void downloadStoredFile(item.attachment_path, item.attachment_name || 'attachment').catch((error: unknown) => {
                  push(error instanceof Error ? error.message : 'Download failed.', 'error')
                })}
              >
                <Download size={14} /> {item.attachment_name || 'Download attachment'}
              </Button>
            </div>
          ) : null}
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => void saveAnnouncement({ ...item, pinned: !item.pinned }).then(onChange)}>
              {item.pinned ? 'Unpin' : 'Pin'}
            </Button>
            <Button variant="secondary" onClick={() => void saveAnnouncement({ ...item, status: item.status === 'published' ? 'archived' : 'published' }).then(onChange)}>
              {item.status === 'published' ? 'Archive' : 'Publish'}
            </Button>
            <Button variant="ghost" onClick={() => void deleteAnnouncement(item.id).then(onChange)}>Delete</Button>
          </div>
        </article>
      ))}
    </div>
  )
}

function GuidelinesTab({ items, onChange }: { items: ClassGuideline[]; onChange: () => Promise<void> }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <GuidelineEditor key={item.id} item={item} onChange={onChange} />
      ))}
      {items.length === 0 ? (
        <p className="text-sm text-muted">Default SOP templates are created with each class.</p>
      ) : null}
    </div>
  )
}

function GuidelineEditor({ item, onChange }: { item: ClassGuideline; onChange: () => Promise<void> }) {
  const [body, setBody] = useState(item.body)
  const [status, setStatus] = useState(item.status)
  const template = SOP_TEMPLATES.find((entry) => entry.key === item.template_key)
  return (
    <article className="rounded-2xl border border-line bg-white p-4">
      <p className="font-medium">{item.title}</p>
      <Textarea className="mt-2" value={body} onChange={(event) => setBody(event.target.value)} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Select value={status} onChange={(event) => setStatus(event.target.value as PublicationStatus)}>
          <option value="published">published</option>
          <option value="draft">draft</option>
          <option value="archived">archived</option>
        </Select>
        <Button variant="secondary" onClick={() => void saveGuideline({ ...item, body, status, is_override: body !== template?.body }).then(onChange)}>
          Save
        </Button>
        {template ? (
          <Button variant="ghost" onClick={() => setBody(template.body)}>Reset template</Button>
        ) : null}
      </div>
    </article>
  )
}

function ProgressTab({
  course,
  progress,
  topics,
  labs,
  userId,
  onChange,
}: {
  course: CourseClass
  progress: ClassProgress | null
  topics: TaughtTopic[]
  labs: LabTask[]
  userId: string
  onChange: () => Promise<void>
}) {
  const { push } = useToast()
  const [lastWeek, setLastWeek] = useState(progress?.last_week?.toString() ?? '')
  const [lastLecture, setLastLecture] = useState(progress?.last_lecture_number?.toString() ?? '')
  const [lastLab, setLastLab] = useState(progress?.last_lab_number?.toString() ?? '')
  const [lastTopic, setLastTopic] = useState(progress?.last_topic ?? '')
  const [notes, setNotes] = useState(progress?.notes ?? '')
  const [title, setTitle] = useState('')
  const [taughtOn, setTaughtOn] = useState('')
  const [week, setWeek] = useState('')

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <form
        className="space-y-3 rounded-2xl border border-line bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault()
          void saveProgress({
            class_id: course.id,
            last_week: lastWeek ? Number(lastWeek) : null,
            last_lecture_number: lastLecture ? Number(lastLecture) : null,
            last_lab_number: lastLab ? Number(lastLab) : null,
            last_topic: lastTopic,
            notes,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          }).then(onChange).then(() => push('Progress saved.'))
        }}
      >
          <h2 className="font-serif text-2xl">Class notes — what we did last</h2>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Last week"><Input type="number" value={lastWeek} onChange={(event) => setLastWeek(event.target.value)} /></Field>
          <Field label="Last lecture"><Input type="number" value={lastLecture} onChange={(event) => setLastLecture(event.target.value)} /></Field>
          <Field label="Last lab"><Input type="number" value={lastLab} onChange={(event) => setLastLab(event.target.value)} /></Field>
        </div>
        <Field label="Current topic"><Input value={lastTopic} onChange={(event) => setLastTopic(event.target.value)} /></Field>
        <Field label="Instructor notes (private)"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
        <Button type="submit">Save progress</Button>
      </form>
      <div className="space-y-3">
        <form
          className="space-y-3 rounded-2xl border border-line bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault()
            void addTaughtTopic({
              class_id: course.id,
              title,
              week_number: week ? Number(week) : null,
              taught_on: taughtOn || null,
              notes: '',
              resource_id: null,
              lab_id: labs.find((lab) => lab.lab_number === Number(lastLab))?.id ?? null,
              created_by: userId,
            }).then(async () => { setTitle(''); await onChange() })
          }}
        >
          <h2 className="font-serif text-2xl">What we taught</h2>
          <Field label="Topic taught"><Input value={title} onChange={(event) => setTitle(event.target.value)} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Week"><Input type="number" value={week} onChange={(event) => setWeek(event.target.value)} /></Field>
            <Field label="Date"><Input type="date" value={taughtOn} onChange={(event) => setTaughtOn(event.target.value)} /></Field>
          </div>
          <Button type="submit">Add to teaching log</Button>
        </form>
        {topics.map((topic) => (
          <article key={topic.id} className="rounded-2xl bg-white px-4 py-3">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-medium">{topic.title}</p>
                <p className="text-xs text-muted">
                  {topic.week_number ? `Week ${topic.week_number} · ` : ''}
                  {topic.taught_on ? formatDate(topic.taught_on, course.timezone) : 'No date'}
                </p>
              </div>
              <Button variant="ghost" onClick={() => void deleteTaughtTopic(topic.id).then(onChange)}>Remove</Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function AccessTab({ course, onChange }: { course: CourseClass; onChange: () => Promise<void> }) {
  const { push } = useToast()
  const [password, setPassword] = useState('')
  const [qr, setQr] = useState('')
  const url = useMemo(() => classUrl(course.slug), [course.slug])

  useEffect(() => {
    void makeQrDataUrl(url).then(setQr)
  }, [url])

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="font-serif text-2xl">Class link</h2>
        <p className="mt-2 break-all text-sm">{url}</p>
        <p className="mt-2 text-xs text-muted">The password is never included in this link, the QR code, or page metadata.</p>
        {qr ? <img src={qr} alt="Class QR code" className="mt-4 h-40 w-40 rounded-xl border border-line" /> : null}
        <Button className="mt-4" variant="secondary" onClick={() => void navigator.clipboard.writeText(url).then(() => push('Link copied.'))}>
          Copy link
        </Button>
      </section>
      <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
        <h2 className="font-serif text-2xl">Access control</h2>
        <Field label="New shared password">
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <Button
          onClick={() => {
            void setClassPassword(course.id, password).then(() => { setPassword(''); push('Password updated. Existing class sessions were revoked.') })
          }}
        >
          Change password
        </Button>
        <Button variant="secondary" onClick={() => void revokeClassSessions(course.id).then(() => push('Active class sessions revoked.'))}>
          Revoke current access
        </Button>
        <Button variant="secondary" onClick={() => void revokeClassAccess(course.id, true).then(onChange).then(() => push('Student access disabled.'))}>
          Disable student access
        </Button>
        <Button variant="secondary" onClick={() => void revokeClassAccess(course.id, false).then(onChange).then(() => push('Student access enabled.'))}>
          Enable student access
        </Button>
        {course.status !== 'published' ? (
          <p className="text-sm text-danger">
            Students cannot enter until this class is published.
          </p>
        ) : (
          <p className="text-sm text-muted">This class is published. Students can open it with the shared password.</p>
        )}
        {course.status !== 'published' ? (
          <Button onClick={() => void updateClass(course.id, { status: 'published' }).then(onChange).then(() => push('Class published.'))}>
            Publish for students
          </Button>
        ) : null}
      </section>
    </div>
  )
}

function toLocal(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocal(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}
