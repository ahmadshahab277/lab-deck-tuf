import { describe, expect, it } from 'vitest'
import { buildClassSlug, classPath, classUrl, normalizeSlugInput } from './slug'

describe('class slugs and urls', () => {
  it('builds a stable slug', () => {
    expect(buildClassSlug({ course_code: 'CS 101', section: 'A', academic_year: '2026' })).toBe('cs-101-a-2026')
  })

  it('accepts a pasted class link without exposing a password', () => {
    expect(normalizeSlugInput('https://labdesk.tuf.edu/c/cs101-a-2026?x=1')).toBe('cs101-a-2026')
    expect(classPath('cs101-a-2026')).toBe('/c/cs101-a-2026')
    expect(classUrl('cs101-a-2026', 'https://labdesk.example')).toBe('https://labdesk.example/c/cs101-a-2026')
    expect(classUrl('cs101-a-2026', 'https://labdesk.example')).not.toContain('password')
  })
})
