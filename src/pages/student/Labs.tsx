import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState'
import { useClassSession } from '../../context/ClassSessionContext'
import { formatDateTime, padLab } from '../../lib/format'

export function StudentLabs() {
  const { data, slug } = useClassSession()
  if (!data) return <EmptyState title="Labs unavailable" body="Open the class again to load lab manuals." />
  if (data.labs.length === 0) return <EmptyState title="No labs published" body="Published lab manuals will appear here." />

  return (
    <div className="space-y-3">
      <h1 className="font-serif text-4xl">Lab manuals</h1>
      {data.labs.map((lab) => (
        <Link key={lab.id} to={`/c/${slug}/labs/${lab.id}`} className="block rounded-2xl border border-line bg-white p-4">
          <p className="text-xs text-muted">Lab {padLab(lab.lab_number)}</p>
          <h2 className="font-medium">{lab.title}</h2>
          <p className="text-sm text-muted">{lab.deadline ? formatDateTime(lab.deadline, data.course.timezone) : 'No deadline'}</p>
        </Link>
      ))}
    </div>
  )
}
