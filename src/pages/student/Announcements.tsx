import { Download } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useClassSession } from '../../context/ClassSessionContext'
import { useToast } from '../../context/ToastContext'
import { formatDateTime } from '../../lib/format'
import { downloadStoredFile } from '../../lib/student'

export function StudentAnnouncements() {
  const { push } = useToast()
  const { data } = useClassSession()
  if (!data) return <EmptyState title="Announcements unavailable" body="Open the class again to load notices." />
  if (data.announcements.length === 0) {
    return <EmptyState title="No announcements" body="Published class notices will appear here." />
  }

  return (
    <div className="space-y-3">
      <h1 className="font-serif text-4xl">Announcements</h1>
      {data.announcements.map((item) => (
        <article key={item.id} className="rounded-2xl border border-line bg-white p-4">
          <p className="text-xs text-muted">{item.assignee_name ? `Assigned to ${item.assignee_name}` : 'Assigned to the whole class'}</p>
          <h2 className="mt-1 font-medium">{item.title}</h2>
          <p className="mt-2 text-sm whitespace-pre-wrap">{item.body}</p>
          {item.link_url ? (
            <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-pine">
              Open link
            </a>
          ) : null}
          {item.attachment_path ? (
            <div className="mt-3">
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
          <p className="mt-3 text-xs text-muted">{formatDateTime(item.published_at ?? item.created_at, data.course.timezone)}</p>
        </article>
      ))}
    </div>
  )
}