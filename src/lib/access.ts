import type { AdminProfile } from '../types'

export function canAccessAdmin(profile: AdminProfile | null): boolean {
  return profile?.role === 'admin'
}

export function isPublishedStatus(status: string): boolean {
  return status === 'published'
}

export function studentCanSeeResource(resource: { status: string; is_current: boolean }): boolean {
  return resource.status === 'published' && resource.is_current
}

export function studentCanSeeLab(lab: { status: string }): boolean {
  return lab.status === 'published'
}

export function studentCanSeeAssignment(assignment: { is_published: boolean }): boolean {
  return assignment.is_published
}

export function studentCanSeeAnnouncement(item: { status: string }): boolean {
  return item.status === 'published'
}

export function classAcceptsStudents(input: {
  status: string
  access_enabled: boolean
}): boolean {
  return input.status === 'published' && input.access_enabled
}

export const GENERIC_ACCESS_ERROR = 'Unable to verify class access.'
