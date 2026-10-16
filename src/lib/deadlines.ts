import type { AssignmentStatus } from '../types'

export function assignmentDisplayStatus(
  assignment: { status: AssignmentStatus; deadline: string | null },
  now: Date = new Date(),
): AssignmentStatus {
  if (assignment.status === 'cancelled' || assignment.status === 'completed') {
    return assignment.status
  }
  if (assignment.deadline && new Date(assignment.deadline).getTime() < now.getTime()) {
    return 'overdue'
  }
  return assignment.status === 'in_progress' ? 'in_progress' : 'upcoming'
}

export function isUpcomingDeadline(deadline: string | null, now = new Date()): boolean {
  if (!deadline) return false
  const time = new Date(deadline).getTime()
  return time >= now.getTime()
}

export function soonestDeadline<T extends { deadline: string | null }>(items: T[], now = new Date()): T | null {
  const upcoming = items
    .filter((item) => isUpcomingDeadline(item.deadline, now))
    .sort((a, b) => new Date(a.deadline ?? 0).getTime() - new Date(b.deadline ?? 0).getTime())
  return upcoming[0] ?? null
}

export function compareDeadlines(a: string | null, b: string | null): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return new Date(a).getTime() - new Date(b).getTime()
}
