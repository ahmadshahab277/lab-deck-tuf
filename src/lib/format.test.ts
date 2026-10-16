import { describe, expect, it } from 'vitest'
import { formatBytes, formatRelative, padLab, statusLabel } from './format'

describe('format helpers', () => {
  it('formats storage estimates', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(padLab(4)).toBe('04')
    expect(statusLabel('in_progress')).toBe('in progress')
  })

  it('describes how far a deadline is from now', () => {
    const now = Date.parse('2026-10-16T12:00:00Z')
    expect(formatRelative(null, now)).toBe('No deadline')
    expect(formatRelative('2026-10-16T12:00:30Z', now)).toBe('in under a minute')
    expect(formatRelative('2026-10-16T14:00:00Z', now)).toBe('in 2 hr')
    expect(formatRelative('2026-10-18T12:00:00Z', now)).toBe('in 2 days')
    expect(formatRelative('2026-10-15T12:00:00Z', now)).toBe('1 day ago')
  })
})
