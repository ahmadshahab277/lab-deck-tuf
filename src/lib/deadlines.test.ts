import { describe, expect, it } from 'vitest'
import { assignmentDisplayStatus, compareDeadlines, isUpcomingDeadline, soonestDeadline } from './deadlines'

describe('assignmentDisplayStatus', () => {
  const now = new Date('2026-03-01T10:00:00.000Z')

  it('keeps cancelled and completed statuses', () => {
    expect(assignmentDisplayStatus({ status: 'cancelled', deadline: '2026-01-01T00:00:00.000Z' }, now)).toBe('cancelled')
    expect(assignmentDisplayStatus({ status: 'completed', deadline: '2026-01-01T00:00:00.000Z' }, now)).toBe('completed')
  })

  it('marks past deadlines overdue unless completed', () => {
    expect(assignmentDisplayStatus({ status: 'upcoming', deadline: '2026-02-01T00:00:00.000Z' }, now)).toBe('overdue')
    expect(assignmentDisplayStatus({ status: 'in_progress', deadline: '2026-02-01T00:00:00.000Z' }, now)).toBe('overdue')
  })

  it('keeps in_progress before the deadline', () => {
    expect(assignmentDisplayStatus({ status: 'in_progress', deadline: '2026-04-01T00:00:00.000Z' }, now)).toBe('in_progress')
  })
})

describe('deadline helpers', () => {
  it('finds the soonest future deadline', () => {
    const next = soonestDeadline(
      [
        { deadline: '2026-01-01T00:00:00.000Z' },
        { deadline: '2099-01-02T00:00:00.000Z' },
        { deadline: '2099-01-01T00:00:00.000Z' },
      ],
      new Date('2026-06-01T00:00:00.000Z'),
    )
    expect(next?.deadline).toBe('2099-01-01T00:00:00.000Z')
  })

  it('compares null deadlines last', () => {
    expect(compareDeadlines(null, '2026-01-01T00:00:00.000Z')).toBe(1)
    expect(isUpcomingDeadline(null)).toBe(false)
  })
})
