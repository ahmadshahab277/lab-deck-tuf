import { useParams } from 'react-router-dom'
import { useClassSession } from '../../context/ClassSessionContext'
import { formatDateTime, padLab } from '../../lib/format'

export function LabPrint() {
  const { labId } = useParams()
  const { data } = useClassSession()
  const lab = data?.labs.find((item) => item.id === labId)

  if (!lab || !data) {
    return <p className="p-8">This lab is not available for printing.</p>
  }

  return (
    <div className="print-sheet mx-auto max-w-3xl bg-white px-8 py-10 text-black">
      <div className="no-print mb-6 flex justify-between">
        <button type="button" onClick={() => window.print()} className="rounded-xl bg-pine px-3 py-2 text-sm text-white">
          Print
        </button>
        <a href={`/c/${data.course.slug}/labs/${lab.id}`} className="text-sm text-muted">Back</a>
      </div>
      <p className="text-sm">{data.course.title} · {data.course.course_code} · Section {data.course.section}</p>
      <h1 className="mt-2 font-serif text-4xl">Lab {padLab(lab.lab_number)}: {lab.title}</h1>
      <p className="mt-2 text-sm">{lab.deadline ? `Deadline: ${formatDateTime(lab.deadline, data.course.timezone)}` : ''}</p>
      <PrintSection title="Objectives" body={lab.objectives} />
      <PrintSection title="Instructions" body={lab.instructions} />
      <PrintSection title="Exercises" body={lab.exercises} />
      <PrintSection title="Required concepts" body={lab.required_concepts} />
      <PrintSection title="Sample input" body={lab.sample_input} />
      <PrintSection title="Sample output" body={lab.sample_output} />
      <PrintSection title="Printing requirements" body={lab.printing_requirements} />
      <PrintSection title="Submission guidelines" body={lab.submission_guidelines} />
      <PrintSection title="Assessment criteria" body={lab.assessment_criteria} />
    </div>
  )
}

function PrintSection({ title, body }: { title: string; body: string }) {
  if (!body) return null
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 whitespace-pre-wrap leading-7">{body}</p>
    </section>
  )
}
