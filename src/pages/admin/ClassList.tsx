import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState, Spinner } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Field'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { deleteClass, duplicateClass, listClasses, updateClass } from '../../lib/admin'
import { adminSearchNeedle } from '../../lib/search'
import type { CourseClass } from '../../types'

export function ClassList() {
  const { profile } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [items, setItems] = useState<CourseClass[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setItems(await listClasses())
  }

  useEffect(() => {
    refresh()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load classes.'))
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(
    () => items.filter((item) => adminSearchNeedle(query, [item.title, item.course_code, item.section, item.slug, item.semester])),
    [items, query],
  )

  if (loading) return <Spinner label="Loading classes" />
  if (error) return <EmptyState title="Classes unavailable" body={error} />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Classes</h1>
          <p className="text-sm text-muted">Create, publish, archive, and share class links.</p>
        </div>
        <Link to="/admin/classes/new"><Button>New class</Button></Link>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search classes" />
      {visible.length === 0 ? (
        <EmptyState title="No classes" body="Create a class to publish outlines, labs, and deadlines." />
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <article key={item.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={`/admin/classes/${item.id}`} className="font-medium hover:text-pine">
                    {item.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {item.course_code} · {item.semester} · Section {item.section} · {item.academic_year}
                  </p>
                </div>
                <Badge value={item.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => navigate(`/admin/classes/${item.id}`)}>Open</Button>
                {item.status !== 'published' ? (
                  <Button variant="secondary" onClick={() => void updateClass(item.id, { status: 'published' }).then(refresh).then(() => push('Class published.'))}>
                    Publish
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => void updateClass(item.id, { status: 'draft' }).then(refresh).then(() => push('Class unpublished.'))}>
                    Unpublish
                  </Button>
                )}
                <Button variant="secondary" onClick={() => void updateClass(item.id, { status: 'archived' }).then(refresh).then(() => push('Class archived.'))}>
                  Archive
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const password = window.prompt('Set a new class password for the copy (min 8 characters).')
                    if (!password || !profile) return
                    void duplicateClass(item, profile.id, password)
                      .then((copy) => {
                        push('Class duplicated as a draft.')
                        navigate(`/admin/classes/${copy.id}`)
                      })
                      .catch((err: unknown) => push(err instanceof Error ? err.message : 'Duplicate failed.', 'error'))
                  }}
                >
                  Duplicate
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!window.confirm('Delete this class and its files? This cannot be undone.')) return
                    void deleteClass(item.id).then(refresh).then(() => push('Class deleted.'))
                  }}
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
