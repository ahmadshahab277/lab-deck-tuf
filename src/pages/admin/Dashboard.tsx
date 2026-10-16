import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, Spinner } from '../../components/ui/EmptyState'
import { listAnnouncements, listAssignments, listClasses, listLabs, listResources, storageEstimate } from '../../lib/admin'
import { assignmentDisplayStatus, compareDeadlines, soonestDeadline } from '../../lib/deadlines'
import { formatBytes, formatDateTime, formatRelative } from '../../lib/format'
import { annotateToday, formatClock, formatClockRange, nextUpcoming, timingsForClass, WEEKDAY_ORDER, WEEKDAYS, zonedMinutes, zonedWeekday } from '../../lib/timetable'
import { ensureFallTimetable } from '../../lib/fallTimetable'
import type { Announcement, CourseClass, LabTask, Resource, TaskAssignment, TimetableSlot } from '../../types'

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classes, setClasses] = useState<CourseClass[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [labs, setLabs] = useState<LabTask[]>([])
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [bytes, setBytes] = useState(0)
  const [timetable, setTimetable] = useState<TimetableSlot[]>([])
  const [timetableNote, setTimetableNote] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      listClasses(),
      listResources(),
      listLabs(),
      listAssignments(),
      listAnnouncements(),
      storageEstimate(),
    ])
      .then(async ([nextClasses, nextResources, nextLabs, nextAssignments, nextAnnouncements, nextBytes]) => {
        if (!active) return
        const nextTimetable = await ensureFallTimetable(nextClasses)
        if (!active) return
        setClasses(nextClasses)
        setResources(nextResources)
        setLabs(nextLabs)
        setAssignments(nextAssignments)
        setAnnouncements(nextAnnouncements)
        setBytes(nextBytes)
        setTimetable(nextTimetable.slots)
        setTimetableNote(null)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load dashboard.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) return <Spinner label="Loading dashboard" />
  if (error) return <EmptyState title="Dashboard unavailable" body={error} />

  const publishedResources = resources.filter((item) => item.status === 'published' && item.is_current)
  const draftResources = resources.filter((item) => item.status === 'draft' && item.is_current)
  const currentResources = publishedResources.length + draftResources.length
  const liveClasses = classes.filter((item) => item.status === 'published')
  const publishedLabs = labs.filter((item) => item.status === 'published')
  const openAssignments = assignments.filter((item) => {
    const status = assignmentDisplayStatus(item)
    return status === 'upcoming' || status === 'overdue' || status === 'in_progress'
  })
  const overdue = openAssignments.filter((item) => assignmentDisplayStatus(item) === 'overdue')
  const nextDeadline = soonestDeadline(openAssignments)
  const deadlineRows = [...openAssignments].sort((a, b) => {
    const aLate = assignmentDisplayStatus(a) === 'overdue' ? 0 : 1
    const bLate = assignmentDisplayStatus(b) === 'overdue' ? 0 : 1
    if (aLate !== bLate) return aLate - bLate
    return compareDeadlines(a.deadline, b.deadline)
  })
  const classById = new Map(classes.map((item) => [item.id, item]))
  const weekday = zonedWeekday()
  const minutes = zonedMinutes()
  const todaySchedule = annotateToday(timetable, weekday, minutes)
  const upcomingClass = todaySchedule.length > 0 ? null : nextUpcoming(timetable, weekday, minutes)
  const today = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  const figures = [
    { label: 'Live classes', value: String(liveClasses.length), hint: classes.length === liveClasses.length ? 'All published' : `${classes.length} total` },
    { label: 'Hidden drafts', value: String(draftResources.length), hint: draftResources.length === 0 ? 'Nothing waiting' : 'Not visible yet' },
    { label: 'Open deadlines', value: String(openAssignments.length), hint: overdue.length === 0 ? 'None overdue' : `${overdue.length} overdue` },
    { label: 'Storage', value: formatBytes(bytes), hint: 'Uploaded files' },
  ]

  return (
    <div className="space-y-10">
      <header className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.7fr)]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-muted uppercase">{today}</p>
          <h1 className="mt-2 font-serif text-6xl leading-[0.9] tracking-tight sm:text-7xl">{WEEKDAYS[weekday]}</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
            {workspaceSummary(liveClasses.length, draftResources.length, overdue.length, nextDeadline?.deadline ?? null)}
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link to="/admin/classes/new" className="inline-flex items-center gap-1 border-b border-ink pb-0.5">
              Create class <ArrowUpRight size={14} />
            </Link>
            <Link to="/admin/content" className="inline-flex items-center gap-1 border-b border-ink/25 pb-0.5 text-muted">
              Upload resource <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
        <DeadlinePlate deadline={nextDeadline} course={nextDeadline ? classById.get(nextDeadline.class_id) : undefined} />
      </header>

      {overdue.length > 0 ? (
        <a href="#deadlines" className="inline-flex items-center gap-2 text-sm font-medium text-danger">
          {overdue.length} {overdue.length === 1 ? 'task is' : 'tasks are'} past the deadline
          <ArrowUpRight size={14} />
        </a>
      ) : null}

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-serif text-3xl tracking-tight">Today</h2>
          <Link to="/admin/settings" className="text-xs font-medium text-pine">Update timetable</Link>
        </div>
        <ScheduleStrip
          slots={todaySchedule}
          upcoming={upcomingClass}
          note={timetableNote}
          hasTimetable={timetable.length > 0}
        />
        {timetable.length > 0 ? <WeekList slots={timetable} /> : null}
      </section>

      <section className="grid grid-cols-2 border-y border-ink/15 md:grid-cols-4 md:divide-x md:divide-ink/15">
        {figures.map((figure) => (
          <div key={figure.label} className="py-4 md:px-5 md:first:pl-0 md:last:pr-0">
            <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">{figure.label}</p>
            <p className="mt-2 font-serif text-4xl leading-none tracking-tight tabular-nums">{figure.value}</p>
            <p className="mt-2 text-xs text-muted">{figure.hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-10 lg:grid-cols-[1fr_16rem]">
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Publishing</p>
          <div className="mt-3 space-y-3">
            <Hairline label="Resources students can open" value={publishedResources.length} total={currentResources} />
            <Hairline label="Classes live" value={liveClasses.length} total={classes.length} />
            <Hairline label="Labs published" value={publishedLabs.length} total={labs.length} />
          </div>
        </div>
        <p className="self-end text-sm leading-6 text-muted">
          {labs.length} lab {labs.length === 1 ? 'task' : 'tasks'} across the workspace.
          {publishedResources.length === 0 ? ' Nothing is published yet.' : ` ${publishedResources.length} current files are published.`}
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-serif text-3xl tracking-tight">Classes</h2>
          <Link to="/admin/classes" className="inline-flex items-center gap-1 text-xs font-medium text-pine">
            View all <ArrowUpRight size={13} />
          </Link>
        </div>
        {classes.length === 0 ? (
          <p className="text-sm text-muted">No classes yet. Create one to share a class link.</p>
        ) : (
          <ul className="divide-y divide-ink/10 border-y border-ink/15">
            {classes.slice(0, 6).map((item, index) => (
              <li key={item.id}>
                <Link to={`/admin/classes/${item.id}`} className="group grid gap-1 py-3 sm:grid-cols-[3.5rem_6rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                  <span className="font-mono text-[11px] text-muted">{String(index + 1).padStart(2, '0')}</span>
                  <span className="font-mono text-xs">{item.course_code || '—'}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium group-hover:text-pine">{item.title}</span>
                    <span className="text-xs text-muted">
                      Section {item.section || '—'}
                      {classTiming(timetable, item)}
                    </span>
                  </span>
                  <Badge value={item.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {classes.length > 6 ? <p className="mt-2 text-xs text-muted">Showing 6 of {classes.length}.</p> : null}
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        <section>
          <h2 className="font-serif text-3xl tracking-tight">Notices</h2>
          {announcements.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No announcements yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/15">
              {announcements.slice(0, 5).map((item) => (
                <li key={item.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{item.title}</p>
                    {item.pinned ? <span className="font-mono text-[10px] tracking-[0.14em] text-pine uppercase">Pinned</span> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {item.assignee_name ? `Assigned to ${item.assignee_name} · ` : ''}
                    {formatDateTime(item.created_at)} · {classLabel(classById.get(item.class_id))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section id="deadlines">
          <h2 className="font-serif text-3xl tracking-tight">Deadlines</h2>
          {deadlineRows.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No open deadlines.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/15">
              {deadlineRows.slice(0, 6).map((item) => {
                const status = assignmentDisplayStatus(item)
                return (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted">{classLabel(classById.get(item.class_id))} · {formatDateTime(item.deadline)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-mono text-[11px] ${status === 'overdue' ? 'text-danger' : 'text-muted'}`}>{formatRelative(item.deadline)}</p>
                      <Badge value={status} className="mt-1" />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {deadlineRows.length > 6 ? <p className="mt-2 text-xs text-muted">Showing 6 of {deadlineRows.length}.</p> : null}
        </section>
      </div>
    </div>
  )
}

function DeadlinePlate({
  deadline,
  course,
}: {
  deadline: TaskAssignment | null
  course: CourseClass | undefined
}) {
  return (
    <aside className="bg-[#141210] p-5 text-white">
      <p className="font-mono text-[10px] tracking-[0.18em] text-white/45 uppercase">Next deadline</p>
      {deadline ? (
        <>
          <p className="mt-3 font-serif text-3xl leading-tight">{deadline.title}</p>
          <p className="mt-2 text-sm text-white/60">{classLabel(course)}</p>
          <p className="mt-5 font-mono text-sm text-[#ffb088]">{formatRelative(deadline.deadline)}</p>
          <p className="mt-1 text-xs text-white/45">{formatDateTime(deadline.deadline)}</p>
        </>
      ) : (
        <p className="mt-3 text-sm text-white/60">Nothing is due. Overdue work, if any, is listed below.</p>
      )}
    </aside>
  )
}

function Hairline({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total <= 0 ? 0 : Math.min(100, Math.round((value / total) * 100))
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-mono text-xs text-muted tabular-nums">{value}/{total}</span>
      </div>
      <div className="h-px bg-ink/15" role={total > 0 ? 'meter' : undefined} aria-label={label} aria-valuemin={total > 0 ? 0 : undefined} aria-valuemax={total > 0 ? total : undefined} aria-valuenow={total > 0 ? value : undefined}>
        <div className="h-px bg-pine" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ScheduleStrip({
  slots,
  upcoming,
  note,
  hasTimetable,
}: {
  slots: ReturnType<typeof annotateToday<TimetableSlot>>
  upcoming: TimetableSlot | null
  note: string | null
  hasTimetable: boolean
}) {
  if (note) return <p className="text-sm text-danger">{note}</p>
  if (!hasTimetable) {
    return <p className="max-w-lg text-sm text-muted">No timetable yet. Upload a photo in Settings and today’s classes will line up here.</p>
  }
  if (slots.length === 0) {
    return (
      <p className="max-w-lg text-sm text-muted">
        {upcoming
          ? `Nothing scheduled today. Next is ${WEEKDAYS[upcoming.day_of_week]}, ${formatClockRange(upcoming.start_time, upcoming.end_time)} — ${upcoming.title}.`
          : 'Nothing scheduled today.'}
      </p>
    )
  }
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {slots.map((slot) => {
        const active = slot.phase === 'now'
        return (
          <article
            key={slot.id}
            className={`flex min-w-[15rem] flex-1 flex-col justify-between p-4 ${active ? 'bg-[#141210] text-white' : 'bg-white'} ${slot.phase === 'done' ? 'opacity-50' : ''}`}
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className={`font-mono text-[11px] ${active ? 'text-[#ffb088]' : 'text-muted'}`}>
                  {formatClock(slot.start_time)} – {formatClock(slot.end_time)}
                </p>
                {slot.phase === 'now' ? <span className="font-mono text-[10px] tracking-[0.14em] text-[#ffb088] uppercase">Now</span> : null}
                {slot.phase === 'next' ? <span className="font-mono text-[10px] tracking-[0.14em] text-pine uppercase">Next</span> : null}
              </div>
              <h3 className="mt-8 font-serif text-2xl leading-tight">{slot.title}</h3>
            </div>
            <div className="mt-6">
              {slotDetail(slot) ? <p className={`text-xs ${active ? 'text-white/60' : 'text-muted'}`}>{slotDetail(slot)}</p> : null}
              {slot.class_id ? (
                <Link to={`/admin/classes/${slot.class_id}`} className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${active ? 'text-[#ffb088]' : 'text-pine'}`}>
                  Open class <ArrowUpRight size={12} />
                </Link>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function WeekList({ slots }: { slots: TimetableSlot[] }) {
  const days = WEEKDAY_ORDER.flatMap((day) => {
    const daySlots = slots.filter((slot) => slot.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
    return daySlots.length > 0 ? [{ day, daySlots }] : []
  })
  return (
    <div className="mt-8">
      <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">This week</p>
      <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/15">
      {days.map(({ day, daySlots }) => (
        <li key={day} className="grid gap-2 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
          <p className="font-medium">{WEEKDAYS[day]}</p>
          <div className="space-y-2">
            {daySlots.map((slot) => (
              <p key={slot.id} className="text-sm">
                <span className="font-mono text-xs text-muted">{formatClockRange(slot.start_time, slot.end_time)}</span>
                <span className="mt-0.5 block">{slot.title}</span>
                {slotDetail(slot) ? <span className="block text-xs text-muted">{slotDetail(slot)}</span> : null}
              </p>
            ))}
          </div>
        </li>
      ))}
      </ul>
    </div>
  )
}

function slotDetail(slot: TimetableSlot): string {
  return [
    slot.course_code,
    slot.section ? `Section ${slot.section}` : '',
    slot.room ? `Room ${slot.room}` : '',
  ].filter(Boolean).join(' · ')
}

function classTiming(slots: TimetableSlot[], course: CourseClass): string {
  const timings = timingsForClass(slots, course)
  if (timings.length === 0) return ''
  const shown = timings.slice(0, 3).map((slot) => `${WEEKDAYS[slot.day_of_week].slice(0, 3)} ${formatClockRange(slot.start_time, slot.end_time)}`)
  const extra = timings.length > 3 ? ` · +${timings.length - 3}` : ''
  return ` · ${shown.join(' · ')}${extra}`
}

function classLabel(course: CourseClass | undefined): string {
  if (!course) return 'Unknown class'
  return [course.course_code, course.section ? `Section ${course.section}` : ''].filter(Boolean).join(' · ') || course.title
}

function workspaceSummary(liveClasses: number, drafts: number, overdue: number, nextDeadline: string | null): string {
  const live = liveClasses === 0 ? 'No classes are live yet.' : `${liveClasses} ${liveClasses === 1 ? 'class is' : 'classes are'} live.`
  const waiting = drafts === 0 ? 'No draft resources are waiting.' : `${drafts} draft ${drafts === 1 ? 'resource is' : 'resources are'} still hidden.`
  const due = overdue > 0
    ? `${overdue} ${overdue === 1 ? 'task is' : 'tasks are'} overdue.`
    : nextDeadline
      ? `Next deadline is ${formatRelative(nextDeadline)}.`
      : 'No deadline is coming up.'
  return `${live} ${waiting} ${due}`
}
