import { EmptyState } from '../../components/ui/EmptyState'
import { useClassSession } from '../../context/ClassSessionContext'

export function StudentGuidelines() {
  const { data } = useClassSession()
  if (!data) return <EmptyState title="Guidelines unavailable" body="Open the class again to load instructions." />

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">Submission guidelines</h1>
      <p className="text-sm text-muted">
        Students do not upload work here. Follow the latest published instructions and submit printed files as directed.
      </p>
      {data.course.submission_guidelines ? (
        <article className="rounded-2xl border border-line bg-white p-4">
          <h2 className="font-medium">Class instructions</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{data.course.submission_guidelines}</p>
        </article>
      ) : null}
      {data.guidelines.length === 0 ? (
        <EmptyState title="No published SOPs" body="The instructor has not published submission templates for this class." />
      ) : (
        data.guidelines.map((item) => (
          <article key={item.id} className="rounded-2xl border border-line bg-white p-4">
            <h2 className="font-medium">{item.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{item.body}</p>
          </article>
        ))
      )}
    </div>
  )
}
