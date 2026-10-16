import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, Spinner } from '../../components/ui/EmptyState'
import { Input, Select } from '../../components/ui/Field'
import { listClasses, listLabs, listResources } from '../../lib/admin'
import { formatBytes, resourceTypeLabel } from '../../lib/format'
import { adminSearchNeedle } from '../../lib/search'
import type { CourseClass, LabTask, Resource } from '../../types'

export function ContentManager() {
  const [classes, setClasses] = useState<CourseClass[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [labs, setLabs] = useState<LabTask[]>([])
  const [query, setQuery] = useState('')
  const [classId, setClassId] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [semester, setSemester] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listClasses(), listResources(), listLabs()])
      .then(([nextClasses, nextResources, nextLabs]) => {
        setClasses(nextClasses)
        setResources(nextResources)
        setLabs(nextLabs)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load content.'))
      .finally(() => setLoading(false))
  }, [])

  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes])
  const semesters = [...new Set(classes.map((item) => item.semester))]

  const visibleResources = resources.filter((item) => {
    const course = classMap.get(item.class_id)
    if (classId && item.class_id !== classId) return false
    if (type && item.resource_type !== type) return false
    if (status && item.status !== status) return false
    if (semester && course?.semester !== semester) return false
    return adminSearchNeedle(query, [item.title, item.file_name, item.topic, course?.title ?? '', course?.course_code ?? ''])
  })

  const visibleLabs = labs.filter((item) => {
    const course = classMap.get(item.class_id)
    if (classId && item.class_id !== classId) return false
    if (status && item.status !== status) return false
    if (semester && course?.semester !== semester) return false
    if (type) return false
    return adminSearchNeedle(query, [item.title, item.required_concepts, `lab ${item.lab_number}`])
  })

  if (loading) return <Spinner label="Loading content" />
  if (error) return <EmptyState title="Content unavailable" body={error} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-4xl">Content</h1>
        <p className="text-sm text-muted">Filter resources and labs across every class.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
        <Select value={classId} onChange={(event) => setClassId(event.target.value)}>
          <option value="">All classes</option>
          {classes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </Select>
        <Select value={semester} onChange={(event) => setSemester(event.target.value)}>
          <option value="">All semesters</option>
          {semesters.map((item) => <option key={item} value={item}>{item}</option>)}
        </Select>
        <Select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">All types</option>
          <option value="outline">outline</option>
          <option value="lecture">lecture</option>
          <option value="lab_manual">lab manual</option>
          <option value="slides">slides</option>
          <option value="code">code</option>
          <option value="handout">handout</option>
        </Select>
      </div>
      <Select value={status} onChange={(event) => setStatus(event.target.value)} className="max-w-xs">
        <option value="">All statuses</option>
        <option value="draft">draft</option>
        <option value="published">published</option>
        <option value="archived">archived</option>
      </Select>

      <section className="space-y-2">
        <h2 className="font-serif text-2xl">Resources</h2>
        {visibleResources.length === 0 ? <p className="text-sm text-muted">No matching resources.</p> : null}
        {visibleResources.map((item) => (
          <Link key={item.id} to={`/admin/classes/${item.class_id}`} className="block rounded-2xl border border-line bg-white p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted">
                  {classMap.get(item.class_id)?.title} · {resourceTypeLabel(item.resource_type)} · {formatBytes(item.file_size)}
                  {item.is_current ? ' · current version' : ` · v${item.version}`}
                </p>
              </div>
              <Badge value={item.status} />
            </div>
          </Link>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-2xl">Labs</h2>
        {visibleLabs.map((item) => (
          <Link key={item.id} to={`/admin/classes/${item.class_id}`} className="block rounded-2xl border border-line bg-white p-4">
            <div className="flex justify-between">
              <p className="font-medium">Lab {String(item.lab_number).padStart(2, '0')} · {item.title}</p>
              <Badge value={item.status} />
            </div>
          </Link>
        ))}
      </section>
    </div>
  )
}
