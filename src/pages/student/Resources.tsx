import { useState } from 'react'
import { Download, Eye } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { useClassSession } from '../../context/ClassSessionContext'
import { useToast } from '../../context/ToastContext'
import { formatBytes, resourceTypeLabel } from '../../lib/format'
import { canPreview, isImagePreview, isTextPreview } from '../../lib/preview'
import { fetchPreviewText, openResourceDownload, previewUrl } from '../../lib/student'
import type { StudentResource } from '../../types'

export function StudentResources() {
  const { push } = useToast()
  const { data, token } = useClassSession()
  const [preview, setPreview] = useState<{ resource: StudentResource; url?: string; text?: string } | null>(null)
  if (!data) return <EmptyState title="Resources unavailable" body="Open the class again to load files." />
  if (data.resources.length === 0) {
    return <EmptyState title="No resources yet" body="Published lectures and files will appear here." />
  }

  async function openPreview(resource: StudentResource) {
    try {
      if (!canPreview(resource.file_name, resource.file_mime)) {
        await openResourceDownload(resource.id, token ?? undefined)
        return
      }
      if (isTextPreview(resource.file_name, resource.file_mime)) {
        const text = await fetchPreviewText(resource.id, token ?? undefined)
        setPreview({ resource, text })
        return
      }
      const url = await previewUrl(resource.id, token ?? undefined)
      setPreview({ resource, url })
    } catch (error) {
      push(error instanceof Error ? error.message : 'Preview is not available.', 'error')
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="font-serif text-4xl">Lectures & resources</h1>
      {data.resources.map((item) => (
        <article key={item.id} className="rounded-2xl border border-line bg-white p-4">
          <p className="text-xs text-muted">{resourceTypeLabel(item.resource_type)}{item.week_number ? ` · Week ${item.week_number}` : ''}</p>
          <h2 className="font-medium">{item.title}</h2>
          <p className="text-sm text-muted">{item.description}</p>
          <p className="mt-1 text-xs text-muted">{item.file_name} · {formatBytes(item.file_size)} · v{item.version}</p>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => {
                void openResourceDownload(item.id, token ?? undefined).catch((error: unknown) => {
                  push(error instanceof Error ? error.message : 'Download failed.', 'error')
                })
              }}
            >
              <Download size={14} /> Download
            </Button>
            {canPreview(item.file_name, item.file_mime) ? (
              <Button variant="secondary" onClick={() => void openPreview(item)}>
                <Eye size={14} /> Preview
              </Button>
            ) : null}
          </div>
        </article>
      ))}
      {preview ? (
        <Modal title={preview.resource.title} onClose={() => setPreview(null)} wide>
          {preview.text ? <pre className="overflow-auto text-sm">{preview.text}</pre> : null}
          {preview.url && (preview.resource.file_mime === 'application/pdf' || preview.resource.file_name.toLowerCase().endsWith('.pdf')) ? (
            <iframe title={preview.resource.title} src={preview.url} className="h-[70vh] w-full rounded-xl border border-line" />
          ) : null}
          {preview.url && (isImagePreview(preview.resource.file_mime) || /\.(png|jpe?g|webp|gif)$/i.test(preview.resource.file_name)) ? (
            <img src={preview.url} alt={preview.resource.title} className="max-h-[70vh] rounded-xl" />
          ) : null}
        </Modal>
      ) : null}
    </div>
  )
}
