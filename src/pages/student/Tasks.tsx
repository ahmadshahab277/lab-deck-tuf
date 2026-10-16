import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { useClassSession } from '../../context/ClassSessionContext'
import { assignmentDisplayStatus } from '../../lib/deadlines'
import { formatDateTime } from '../../lib/format'

export function StudentTasks() {
  const { data } = useClassSession()
  if (!data) return <EmptyState title="Tasks unavailable" body="Open the class again to load assignments." />
  if (data.assignments.length === 0) {
    return <EmptyState title="No published tasks" body="Visible responsibilities and deadlines will appear here." />
  }

  return (
    <div className="space-y-3">
      <h1 className="font-serif text-4xl">Tasks & deadlines</h1>
      {data.assignments.map((item) => {
        const status = assignmentDisplayStatus(item)
        const audience =
          item.assignee_type === 'class'
            ? 'This task is assigned to the entire class.'
            : `This task is assigned to ${item.assignee_name}, not automatically to every student. The name was entered by the instructor and is not verified by this app.`
        return (
          <article key={item.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex justify-between gap-3">
              <h2 className="font-medium">{item.title}</h2>
              <Badge value={status} />
            </div>
            <p className="mt-2 text-sm">{audience}</p>
            {item.description ? <p className="mt-2 text-sm whitespace-pre-wrap">{item.description}</p> : null}
            {item.instructions ? <p className="mt-2 text-sm whitespace-pre-wrap">{item.instructions}</p> : null}
            {item.why_it_matters ? <p className="mt-2 text-sm text-muted">Why it matters: {item.why_it_matters}</p> : null}
            <p className="mt-3 text-xs text-muted">{formatDateTime(item.deadline, data.course.timezone)}</p>
          </article>
        )
      })}
    </div>
  )
}
