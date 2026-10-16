import type { SearchHit, StudentAnnouncement, StudentAssignment, StudentClass, StudentGuideline, StudentLab, StudentResource } from '../types'

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function tokens(query: string): string[] {
  return normalize(query).split(' ').filter((token) => token.length > 0)
}

function score(haystack: string, queryTokens: string[]): number {
  const text = normalize(haystack)
  if (!text || queryTokens.length === 0) return 0
  let points = 0
  for (const token of queryTokens) {
    if (text.includes(token)) points += token.length + 2
    if (text.startsWith(token)) points += 3
  }
  return points
}

export function searchClassContent(
  query: string,
  content: {
    course: StudentClass
    labs: StudentLab[]
    resources: StudentResource[]
    assignments: StudentAssignment[]
    announcements: StudentAnnouncement[]
    guidelines: StudentGuideline[]
    slug: string
  },
): SearchHit[] {
  const queryTokens = tokens(query)
  if (queryTokens.length === 0) return []

  const hits: Array<SearchHit & { points: number }> = []

  const outlineText = `${content.course.title} ${content.course.course_code} ${content.course.outline}`
  const outlineScore = score(outlineText, queryTokens)
  if (outlineScore > 0) {
    hits.push({
      id: 'outline',
      kind: 'outline',
      title: 'Course outline',
      subtitle: content.course.title,
      href: `/c/${content.slug}/outline`,
      points: outlineScore,
    })
  }

  for (const lab of content.labs) {
    const points = score(
      [
        `lab ${lab.lab_number}`,
        lab.title,
        lab.objectives,
        lab.required_concepts,
        lab.exercises,
        lab.instructions,
      ].join(' '),
      queryTokens,
    )
    if (points > 0) {
      hits.push({
        id: lab.id,
        kind: 'lab',
        title: `Lab ${String(lab.lab_number).padStart(2, '0')} · ${lab.title}`,
        subtitle: lab.required_concepts || lab.objectives.slice(0, 90),
        href: `/c/${content.slug}/labs/${lab.id}`,
        points,
      })
    }
  }

  for (const resource of content.resources) {
    const points = score(
      [resource.title, resource.description, resource.topic, resource.file_name, resource.resource_type].join(' '),
      queryTokens,
    )
    if (points > 0) {
      hits.push({
        id: resource.id,
        kind: 'resource',
        title: resource.title,
        subtitle: resource.file_name,
        href: `/c/${content.slug}/resources`,
        points,
      })
    }
  }

  for (const task of content.assignments) {
    const points = score(
      [task.title, task.description, task.instructions, task.assignee_name, task.why_it_matters].join(' '),
      queryTokens,
    )
    if (points > 0) {
      hits.push({
        id: task.id,
        kind: 'task',
        title: task.title,
        subtitle: task.assignee_type === 'class' ? 'Assigned to the class' : `Assigned to ${task.assignee_name}`,
        href: `/c/${content.slug}/tasks`,
        points,
      })
    }
  }

  for (const item of content.announcements) {
    const points = score(`${item.title} ${item.body} ${item.assignee_name} ${item.link_url}`, queryTokens)
    if (points > 0) {
      hits.push({
        id: item.id,
        kind: 'announcement',
        title: item.title,
        subtitle: item.body.slice(0, 90),
        href: `/c/${content.slug}/announcements`,
        points,
      })
    }
  }

  for (const item of content.guidelines) {
    const points = score(`${item.title} ${item.body}`, queryTokens)
    if (points > 0) {
      hits.push({
        id: item.id,
        kind: 'guideline',
        title: item.title,
        subtitle: 'Submission guidelines',
        href: `/c/${content.slug}/guidelines`,
        points,
      })
    }
  }

  return hits.sort((a, b) => b.points - a.points).slice(0, 20)
}

export function adminSearchNeedle(query: string, fields: string[]): boolean {
  const queryTokens = tokens(query)
  if (queryTokens.length === 0) return true
  return score(fields.join(' '), queryTokens) > 0
}
