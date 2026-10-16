import { describe, expect, it } from 'vitest'
import {
  canAccessAdmin,
  classAcceptsStudents,
  studentCanSeeAnnouncement,
  studentCanSeeAssignment,
  studentCanSeeLab,
  studentCanSeeResource,
} from './access'
import { publicAssignmentFields } from './labTemplate'

describe('access rules', () => {
  it('denies admin access without an admin profile', () => {
    expect(canAccessAdmin(null)).toBe(false)
    expect(canAccessAdmin({ id: '1', email: 'a@x.com', full_name: 'Ahmad Shahab', role: 'admin' })).toBe(true)
  })

  it('keeps unpublished student content hidden', () => {
    expect(studentCanSeeResource({ status: 'draft', is_current: true })).toBe(false)
    expect(studentCanSeeResource({ status: 'published', is_current: false })).toBe(false)
    expect(studentCanSeeLab({ status: 'draft' })).toBe(false)
    expect(studentCanSeeAssignment({ is_published: false })).toBe(false)
    expect(studentCanSeeAnnouncement({ status: 'archived' })).toBe(false)
    expect(classAcceptsStudents({ status: 'archived', access_enabled: true })).toBe(false)
  })

  it('strips admin notes from student-visible assignment fields', () => {
    const visible = publicAssignmentFields({
      title: 'Prepare demo',
      admin_notes: 'Private phone number 0300',
    })
    expect(visible).toEqual({ title: 'Prepare demo' })
    expect('admin_notes' in visible).toBe(false)
  })
})
