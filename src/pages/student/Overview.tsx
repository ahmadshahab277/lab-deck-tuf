import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BookMarked, ClipboardList, Download, FileText } from 'lucide-react'
import { InstallCard } from '../../components/pwa/InstallCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Stat } from '../../components/ui/Stat'
import { Widget } from '../../components/ui/Widget'
import { useClassSession } from '../../context/ClassSessionContext'
import { useToast } from '../../context/ToastContext'
import { assignmentDisplayStatus, soonestDeadline } from '../../lib/deadlines'
import { formatDateTime, formatRelative, padLab, resourceTypeLabel } from '../../lib/format'
import { openResourceDownload } from '../../lib/student'

const linkClass = 'text-xs font-medium text-pine'

export function StudentOverview() {
  const { push } = useToast()
  const { data, token, slug } = useClassSession()
  if (!data || !slug) return <EmptyState title="Class unavailable" body="Open the class again with the shared password." />

  const { course, announcements, labs, assignments, resources } = data
  const nextLab = labs[labs.length - 1]
  const openTasks = assignments.filter((item) => {
    const status = assignmentDisplayStatus(item)
    return status !== 'completed' && status !== 'cancelled'
  })
  const upcoming = soonestDeadline(openTasks)
  const recent = resources.slice(0, 4)
  const pinned = announcements.filter((item) => item.pinned).concat(announcements.filter((item) => !item.pinned)).slice(0, 3)
  const visibleTasks = assignments.filter((item) => assignmentDisplayStatus(item) !== 'cancelled').slice(0, 5)

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="h-1 bg-pine" />
        <div className="p-5">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">{course.course_code}</p>
          <h1 className="mt-1 font-serif text-4xl tracking-tight">{course.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Meta>Section {course.section}</Meta>
            <Meta>{course.semester}</Meta>
            <Meta>{course.academic_year}</Meta>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Labs" value={labs.length} hint="Manuals in this class" icon={BookMarked} />
        <Stat
          label="Open tasks"
          value={openTasks.length}
          hint={upcoming ? `Next due ${formatRelative(upcoming.deadline)}` : 'Nothing left open'}
          icon={ClipboardList}
        />
        <Stat label="Files" value={resources.length} hint="Lectures and handouts" icon={FileText} />
        <Stat label="Notices" value={announcements.length} hint="From your instructor" icon={Bell} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Current lab</p>
          {nextLab ? (
            <>
              <p className="mt-3 font-mono text-xs text-pine">Lab {padLab(nextLab.lab_number)}</p>
              <h2 className="mt-1 font-serif text-3xl tracking-tight">{nextLab.title}</h2>
              {nextLab.objectives ? <p className="mt-2 line-clamp-2 text-sm text-muted">{nextLab.objectives}</p> : null}
              <Link to={`/c/${slug}/labs/${nextLab.id}`} className="mt-4 inline-flex">
                <Button>Open lab</Button>
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">No published labs yet.</p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Upcoming deadline</p>
          {upcoming ? (
            <>
              <h2 className="mt-3 font-serif text-3xl tracking-tight">{upcoming.title}</h2>
              <p className="mt-2 text-sm text-muted">{assigneeLine(upcoming.assignee_type, upcoming.assignee_name)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-pine-soft px-2.5 py-1 font-mono text-xs text-pine">
                  {formatRelative(upcoming.deadline)}
                </span>
                <span className="text-sm text-muted">{formatDateTime(upcoming.deadline, course.timezone)}</span>
                <Badge value={assignmentDisplayStatus(upcoming)} />
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">No upcoming deadlines.</p>
          )}
        </section>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Widget icon={Bell} label="Announcements" action={<Link to={`/c/${slug}/announcements`} className={linkClass}>All</Link>}>
          {pinned.length === 0 ? <p className="text-sm text-muted">No announcements yet.</p> : (
            <ul className="space-y-2">
              {pinned.map((item) => (
                <li key={item.id} className="rounded-xl border border-line px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.pinned ? <span className="shrink-0 font-mono text-[10px] tracking-wide text-pine uppercase">Pinned</span> : null}
                  </div>
                  {item.assignee_name ? <p className="mt-1 text-xs text-muted">Assigned to {item.assignee_name}</p> : null}
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Widget>
        <Widget icon={FileText} label="Recent resources" action={<Link to={`/c/${slug}/resources`} className={linkClass}>All</Link>}>
          {recent.length === 0 ? <p className="text-sm text-muted">No published files yet.</p> : (
            <ul className="space-y-2">
              {recent.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted">{resourceTypeLabel(item.resource_type)}</span>
                  </span>
                  <Button
                    variant="ghost"
                    aria-label={`Download ${item.title}`}
                    onClick={() => {
                      void openResourceDownload(item.id, token ?? undefined).catch((error: unknown) => {
                        push(error instanceof Error ? error.message : 'Download failed.', 'error')
                      })
                    }}
                  >
                    <Download size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Widget>
      </div>

      <Widget icon={ClipboardList} label="Assigned tasks" action={<Link to={`/c/${slug}/tasks`} className={linkClass}>All</Link>}>
        {visibleTasks.length === 0 ? (
          <p className="text-sm text-muted">No published tasks yet.</p>
        ) : (
          <ul className="space-y-2">
            {visibleTasks.map((item) => (
              <li key={item.id} className="rounded-xl border border-line px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{item.title}</p>
                  <Badge value={assignmentDisplayStatus(item)} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {item.assignee_type === 'class'
                    ? 'Assigned to the entire class.'
                    : `Assigned to ${item.assignee_name} (name entered by the instructor). This is not automatically assigned to every student.`}
                </p>
                {item.deadline ? (
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    {formatRelative(item.deadline)} · {formatDateTime(item.deadline, course.timezone)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Widget>

      <div className="flex flex-wrap gap-2">
        <Link to={`/c/${slug}/outline`}><Button variant="secondary">Course outline</Button></Link>
        <Link to={`/c/${slug}/labs`}><Button variant="secondary">Lab manuals</Button></Link>
      </div>

      <InstallCard title="Download app" compact />
    </div>
  )
}

function Meta({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">{children}</span>
}

function assigneeLine(type: string, name: string): string {
  if (type === 'class') return 'Assigned to the whole class'
  return `Assigned to ${name}`
}
