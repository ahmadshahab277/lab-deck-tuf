import { useState } from 'react'
import { Download, Eye } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { useClassSession } from '../../context/ClassSessionContext'
import { useToast } from '../../context/ToastContext'
import { formatBytes } from '../../lib/format'
import { openResourceDownload, previewUrl } from '../../lib/student'
import type { StudentResource } from '../../types'

export function StudentOutline() {
  const { push } = useToast()
  const { data, token } = useClassSession()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<StudentResource | null>(null)

  if (!data) return <EmptyState title="Outline unavailable" body="Open the class again to load the outline." />

  const outlineFiles = data.resources.filter((item) => item.resource_type === 'outline')
  const hasText = Boolean(data.course.outline.trim())

  if (!hasText && outlineFiles.length === 0) {
    return <EmptyState title="No outline yet" body="The instructor has not published a text or PDF outline." />
  }

  async function previewPdf(resource: StudentResource) {
    const url = await previewUrl(resource.id, token ?? undefined)
    setPreviewing(resource)
    setPdfUrl(url)
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">Course outline</h1>
      {hasText ? (
        <article className="rounded-2xl border border-line bg-white p-6">
          <h2 className="text-sm font-medium text-muted">Text outline</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{data.course.outline}</p>
        </article>
      ) : null}
      {outlineFiles.map((item) => (
        <article key={item.id} className="rounded-2xl border border-line bg-white p-6">
          <h2 className="text-sm font-medium text-muted">PDF outline</h2>
          <p className="mt-2 font-medium">{item.title}</p>
          <p className="text-xs text-muted">{item.file_name} · {formatBytes(item.file_size)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => void openResourceDownload(item.id, token ?? undefined).catch((error: unknown) => push(error instanceof Error ? error.message : 'Download failed.', 'error'))}>
              <Download size={14} /> Download PDF
            </Button>
            <Button variant="secondary" onClick={() => void previewPdf(item)}>
              <Eye size={14} /> Preview
            </Button>
          </div>
        </article>
      ))}
      {previewing && pdfUrl ? (
        <Modal title={previewing.title} onClose={() => { setPreviewing(null); setPdfUrl(null) }} wide>
          <iframe title={previewing.title} src={pdfUrl} className="h-[70vh] w-full rounded-xl border border-line" />
        </Modal>
      ) : null}
    </div>
  )
}
