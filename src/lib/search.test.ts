import { describe, expect, it } from 'vitest'
import { adminSearchNeedle, searchClassContent } from './search'
import type { StudentClass } from '../types'

const course: StudentClass = {
  id: 'c1',
  slug: 'cs101-a-2026',
  title: 'Programming Fundamentals',
  course_code: 'CS101',
  semester: 'Fall',
  section: 'A',
  academic_year: '2026',
  timezone: 'Asia/Karachi',
  outline: 'Variables, loops, and arrays',
  submission_guidelines: 'Print the file',
}

describe('searchClassContent', () => {
  it('finds labs by number and concept', () => {
    const hits = searchClassContent('lab 04 pointer', {
      course,
      slug: course.slug,
      labs: [{
        id: 'l1',
        lab_number: 4,
        title: 'Pointers',
        objectives: '',
        instructions: '',
        exercises: '',
        required_concepts: 'pointers',
        sample_input: '',
        sample_output: '',
        deadline: null,
        printing_requirements: '',
        submission_guidelines: '',
        assessment_criteria: '',
        manual_resource_id: null,
      }],
      resources: [],
      assignments: [],
      announcements: [],
      guidelines: [],
    })
    expect(hits.some((hit) => hit.kind === 'lab')).toBe(true)
  })

  it('returns nothing for an empty query', () => {
    expect(searchClassContent('   ', {
      course,
      slug: course.slug,
      labs: [],
      resources: [],
      assignments: [],
      announcements: [],
      guidelines: [],
    })).toEqual([])
  })
})

describe('adminSearchNeedle', () => {
  it('matches any token in the fields', () => {
    expect(adminSearchNeedle('cs101', ['Programming', 'CS101'])).toBe(true)
    expect(adminSearchNeedle('biology', ['Programming', 'CS101'])).toBe(false)
  })
})
