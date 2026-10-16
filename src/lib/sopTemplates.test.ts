import { describe, expect, it } from 'vitest'
import { SOP_TEMPLATES } from './sopTemplates'
import { structuredLabTemplate } from './labTemplate'

describe('templates', () => {
  it('includes the required SOP keys', () => {
    const keys = SOP_TEMPLATES.map((item) => item.key)
    expect(keys).toEqual(expect.arrayContaining([
      'lab_rules',
      'file_format',
      'cover_page',
      'problem_code',
      'output_evidence',
      'page_order',
      'printing',
      'physical_deadline',
      'end_semester',
    ]))
  })

  it('creates a structured lab template', () => {
    expect(structuredLabTemplate(3).lab_number).toBe(3)
    expect(structuredLabTemplate(3).title).toContain('03')
  })
})
