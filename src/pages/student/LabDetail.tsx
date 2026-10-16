import { Link, useParams } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useClassSession } from '../../context/ClassSessionContext'
import { useToast } from '../../context/ToastContext'
import { formatDateTime, padLab } from '../../lib/format'
import { openResourceDownload } from '../../lib/student'

export function StudentLabDetail() {
  const { labId, slug } = useParams()
  const { push } = useToast()
  const { data, token } = useClassSession()
  const lab = data?.labs.find((item) => item.id === labId)
  if (!lab || !data) return <EmptyState title="Lab not found" body="This lab is unpublished or unavailable." />

  return (
    <article className="space-y-4 rounded-2xl border border-line bg-white p-6">
      <p className="text-sm text-muted">Lab {padLab(lab.lab_number)}</p>
      <h1 className="font-serif text-4xl">{lab.title}</h1>
      <p className="text-sm text-muted">{lab.deadline ? `Due ${formatDateTime(lab.deadline, data.course.timezone)}` : 'No deadline'}</p>
      <div className="flex flex-wrap gap-2">
        <Link to={`/c/${slug}/labs/${lab.id}/print`}><Button><Printer size={14} /> Print view</Button></Link>
        {lab.manual_resource_id ? (
          <Button variant="secondary" onClick={() => void openResourceDownload(lab.manual_resource_id!, token ?? undefined).catch((error: unknown) => push(error instanceof Error ? error.message : 'Download failed.', 'error'))}>
            <Download size={14} /> Download manual
          </Button>
        ) : null}
      </div>
      <Section title="Objectives" body={lab.objectives} />
      <Section title="Instructions" body={lab.instructions} />
      <Section title="Exercises" body={lab.exercises} />
      <Section title="Required concepts" body={lab.required_concepts} />
      <Section title="Sample input" body={lab.sample_input} />
      <Section title="Sample output" body={lab.sample_output} />
      <Section title="Printing requirements" body={lab.printing_requirements} />
      <Section title="Submission guidelines" body={lab.submission_guidelines} />
      <Section title="Assessment criteria" body={lab.assessment_criteria} />
    </article>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  if (!body) return null
  return (
    <section>
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-7">{body}</p>
    </section>
  )
}
